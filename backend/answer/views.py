from .models import Answer, BackgroundAnswer
from item.models import Item
from .serializers import (
    AnswerSerializer,
    AnswerDashboardSerializer,
    BackgroundAnswerSerializer,
)
from labeling.models import LabelingElement
from labeling.models import Labeling, LabelingMembership, LabelingSection
from common.constants import LLM_TIEBREAK_USERNAME
from annotaise.pagination import StandardCursorPagination
from .session_llm_key import pop_user_llm_key

from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from user.permissions import IsAdminAccount
from django.http import HttpResponse
from .permissions import CanAnswerLabelingPermission, HasItemReservationPermission
from labeling.permissions import CanEditLabelingPermission, can_annotate_labeling
from .services.exceptions import (
    BackgroundFormRequired,
    DecisionInputError,
    ItemAlreadyFinished,
    NoGroupSlotAvailable,
    ReservationMissing,
)
from .services.submit_answer import submit_answer

import pandas as pd

from rest_framework.generics import ListAPIView
from django.db.models import F, Q
from django.db import transaction
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.views.decorators.debug import sensitive_variables
class AnswerViewset(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'delete']
    serializer_class = AnswerSerializer
    permission_classes = [IsAdminAccount]

    def get_permissions(self):

        if self.action in ['create']:
            perm = [CanAnswerLabelingPermission(), HasItemReservationPermission()]
        else:
            perm = [IsAdminAccount()]
        return perm
        
    def get_queryset(self):
        user = getattr(self.request, "user", None)

        if not user or not getattr(user, "is_authenticated", False):
            return Answer.objects.none()

        qs = (
            Answer.objects
            .select_related("item", "labeling")
            .distinct()
        )

        labeling_id = self.request.query_params.get("labeling")
        if labeling_id and labeling_id.isdigit():
            qs = qs.filter(labeling_id=int(labeling_id))

        return qs

    @sensitive_variables("session_llm_key")
    def create(self, request, *args, **kwargs):
        # Tira a chave de IA da sessão do request antes de qualquer outra coisa.
        session_llm_key = pop_user_llm_key(request)

        item = get_object_or_404(Item, pk=request.data.get('item'))
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        try:
            result = submit_answer(
                user=request.user,
                item=item,
                answer_payload=serializer.validated_data.get("answer_payload", {}),
                session_llm_key=session_llm_key,
            )
        except (ItemAlreadyFinished, BackgroundFormRequired, ReservationMissing) as exc:
            return self._rejected(exc, status=403)
        except DecisionInputError as exc:
            return self._rejected(exc, status=400)
        except NoGroupSlotAvailable as exc:
            return self._rejected(exc, status=409)

        response_data = self.get_serializer(result.answer).data
        if result.decision_warning:
            response_data = {**response_data, "decision_warning": result.decision_warning}

        return Response(
            response_data,
            status=201,
            headers=self.get_success_headers(response_data),
        )

    def _rejected(self, exc, status):
        body = {'detail': str(exc)}
        if exc.code:
            body['code'] = exc.code
        return Response(body, status=status)

    def _assert_owner_or_admin(self, answer):
        user = self.request.user
        if getattr(user, "is_staff", False):
            return
        if getattr(answer.labeling, "block_section_back", False):
            raise PermissionDenied("Edições estão bloqueadas para esta rotulação.")
        if answer.answered_by_id != user.id:
            raise PermissionDenied("Você não pode editar esta resposta.")

    def update(self, request, *args, **kwargs):
        answer = self.get_object()
        self._assert_owner_or_admin(answer)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        answer = self.get_object()
        self._assert_owner_or_admin(answer)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        answer = self.get_object()
        self._assert_owner_or_admin(answer)
        return super().destroy(request, *args, **kwargs)


class AnonymousSubmitAnswerView(APIView):
    """
    Public/anonymous answer submission for labelings in anonymous mode.

    Identifies the labeling by the URL token and skips authentication and
    user/membership checks. The answer is stored without an author
    (answered_by=None). Since anonymous mode assumes users_per_item=1 (each
    visitor answers an item exactly once), the item is marked finished as
    soon as it receives an answer — except in form_mode, where items stay
    open.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    @transaction.atomic
    def post(self, request, token):
        labeling = get_object_or_404(
            Labeling,
            anonymous_token=token,
            distribution_strategy=Labeling.DistributionStrategy.ANONYMOUS_MODE,
        )

        if labeling.status == "finished":
            return Response(
                {"detail": "Essa rotulação já foi finalizada", "code": "ROTULACAO_FINALIZADA"},
                status=400,
            )

        item = (
            Item.objects
            .select_for_update()
            .filter(pk=request.data.get("item"), labeling=labeling)
            .first()
        )
        if item is None:
            return Response({"detail": "Item não encontrado para esta rotulação.", "item": "Item é obrigatório."}, status=400)

        if not labeling.form_mode and item.status == "finished":
            return Response(
                {"detail": "Esse item já foi finalizado e não pode mais receber respostas."},
                status=403,
            )

        answer_payload = request.data.get("answer_payload", {})
        if not isinstance(answer_payload, dict):
            return Response({"answer_payload": "Formato inválido."}, status=400)

        answer = Answer.objects.create(
            item=item,
            labeling=labeling,
            answered_by=None,
            answer_payload=answer_payload,
        )

        # users_per_item == 1 in anonymous mode: a single answer already finishes the item.
        if not labeling.form_mode:
            item.status = "finished"
            item.save(update_fields=["status"])

            if not labeling.items.filter(~Q(status="finished")).exists():
                labeling.status = "finished"
                labeling.save(update_fields=["status"])

        return Response(
            {
                "id": answer.id,
                "item": answer.item_id,
                "labeling": answer.labeling_id,
                "answer_payload": answer.answer_payload,
                "created_at": answer.created_at,
            },
            status=201,
        )


class AnswerRowCursorPagination(StandardCursorPagination):
    # The screen lists answers in CSV row order. The cursor doesn't accept
    # "__" lookups, so row_index arrives annotated from the item (see get_queryset).
    ordering = ("row_index", "id")


class AnswersDashboardView(ListAPIView):
    serializer_class = AnswerSerializer
    pagination_class = AnswerRowCursorPagination

    def get_queryset(self):
        labeling_id = self.kwargs.get("labeling_id")
        qs = (
            Answer.objects
            .filter(labeling_id=labeling_id)
            .select_related("item", "answered_by", "responded_as")
            .annotate(row_index=F("item__row_index"))
        )

        answered_by = self.request.query_params.get("answered_by")
        if answered_by and answered_by.isdigit():
            qs = qs.filter(answered_by_id=int(answered_by))

        return qs.order_by("row_index", "id")


class LabelingBackgroundAnswerView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_labeling(self, labeling_id):
        return get_object_or_404(Labeling, id=labeling_id)

    def _can_view_labeling(self, user, labeling):
        if LabelingMembership.objects.filter(labeling=labeling, user=user).exists():
            return True
        perm = CanEditLabelingPermission()
        return perm.can_edit_labeling(user, labeling.id)

    def get(self, request, labeling_id, **kwargs):
        labeling = self._get_labeling(labeling_id)
        if not self._can_view_labeling(request.user, labeling):
            raise PermissionDenied("Você não tem acesso a essa rotulação.")

        if not labeling.has_background_form:
            return Response(None, status=200)

        answer = BackgroundAnswer.objects.filter(
            labeling=labeling,
            answered_by=request.user,
        ).first()
        if not answer:
            return Response(None, status=200)

        return Response(BackgroundAnswerSerializer(answer).data, status=200)

    def put(self, request, labeling_id, **kwargs):
        labeling = self._get_labeling(labeling_id)
        if not can_annotate_labeling(request.user, labeling.id):
            raise PermissionDenied("Você não tem acesso a essa rotulação.")

        if not labeling.has_background_form:
            return Response(
                {
                    "detail": "Esta rotulação não possui formulário background.",
                    "code": "BACKGROUND_DISABLED",
                },
                status=400,
            )

        if not LabelingSection.objects.filter(
            labeling=labeling,
            form_type=LabelingSection.FormType.BACKGROUND,
        ).exists():
            return Response(
                {
                    "detail": "Formulário background vazio.",
                    "code": "EMPTY_BACKGROUND_FORM",
                },
                status=400,
            )

        payload = request.data.get("answer_payload")
        if not isinstance(payload, dict):
            return Response(
                {
                    "detail": "answer_payload deve ser um objeto.",
                    "code": "INVALID_BACKGROUND_PAYLOAD",
                },
                status=400,
            )

        answer, created = BackgroundAnswer.objects.update_or_create(
            labeling=labeling,
            answered_by=request.user,
            defaults={"answer_payload": payload},
        )
        serializer = BackgroundAnswerSerializer(answer)
        return Response(serializer.data, status=201 if created else 200)


class LabelingBackgroundAnswersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, labeling_id, **kwargs):
        labeling = get_object_or_404(Labeling, id=labeling_id)
        perm = CanEditLabelingPermission()
        if not perm.can_edit_labeling(request.user, labeling.id):
            raise PermissionDenied("Você não tem permissão para visualizar essas respostas.")

        qs = BackgroundAnswer.objects.filter(labeling=labeling).select_related("answered_by")
        user_id = request.query_params.get("user_id")
        if user_id and user_id.isdigit():
            qs = qs.filter(answered_by_id=int(user_id))

        data = BackgroundAnswerSerializer(qs, many=True).data
        return Response(data, status=200)


class ExportAnswersView(APIView):
    permission_classes = [IsAdminAccount]

    def get(self, request, **kwargs):
        labeling_id = kwargs.get("labeling_id")
        labeling = Labeling.objects.get(id=labeling_id)
        answers = (
            Answer.objects.filter(labeling_id=labeling_id)
            .select_related("item", "answered_by")
            .order_by("item__row_index", "id")
        )
        questions_qs = LabelingElement.objects.filter(
            labeling_section__labeling_id=labeling_id,
            labeling_section__form_type=LabelingSection.FormType.MAIN,
        ).exclude(question_type="context").values('id','text')

        questions = {int(q["id"]): q["text"] for q in questions_qs}

        # build follow-up label map: "followup_103_144" -> "Q : parent text > follow-up text"
        follow_up_labels = {}
        from labeling.models import MultipleChoiceItem
        follow_up_items = (
            MultipleChoiceItem.objects
            .filter(
                labeling_element__labeling_section__labeling_id=labeling_id,
                follow_up_question__isnull=False,
            )
            .select_related("labeling_element", "follow_up_question")
        )
        for mc_item in follow_up_items:
            key = f"followup_{mc_item.labeling_element_id}_{mc_item.id}"
            parent_text = questions.get(mc_item.labeling_element_id, "?")
            fu_text = mc_item.follow_up_question.text or "?"
            follow_up_labels[key] = f"Q : {parent_text} > {mc_item.text} > {fu_text}"

        rows = []
        has_llm = False
        for answer in answers:
            payload = answer.answer_payload
            item_payload = answer.item.payload
            row = {}
            row["context_id"] = (answer.item.row_index or 0) + 1
            is_llm = (
                answer.answered_by_id is not None
                and answer.answered_by.username == LLM_TIEBREAK_USERNAME
            )
            if not answer.answered_by_id:
                row["user_id"] = "anonymous"
            elif is_llm:
                row["user_id"] = ""
            else:
                row["user_id"] = answer.answered_by.id
            row["LLM"] = "YES" if is_llm else ""
            if is_llm:
                has_llm = True
            for question_number, response in payload.items():
                # follow-up answer key
                if question_number.startswith("followup_"):
                    col_name = follow_up_labels.get(question_number)
                    if not col_name:
                        continue
                else:
                    try:
                        q_id = int(question_number)
                    except ValueError:
                        continue
                    question_text = questions.get(q_id)
                    if not question_text:
                        continue
                    col_name = "Q : " + question_text

                if isinstance(response, list):
                    row[col_name] = ", ".join(str(x) for x in response)
                else:
                    row[col_name] = response
            for k, v in item_payload.items():
                row["C : " + k] = v

            rows.append(row)
        df = pd.DataFrame(rows)
        if not has_llm and "LLM" in df.columns:
            df = df.drop(columns=["LLM"])

        # Builds the CSV content as a string, without writing to a file
        csv_data = df.to_csv(index=False)

        response = HttpResponse(csv_data, content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="exported_answers_{labeling.title}.csv"'
        )
        return response
