from .models import Answer, BackgroundAnswer
from item.models import ItemMembership, Item
from .serializers import (
    AnswerSerializer,
    AnswerDashboardSerializer,
    BackgroundAnswerSerializer,
)
from labeling.models import LabelingElement
from labeling.models import Labeling, LabelingMembership, LabelingSection
from annotaise.pagination import StandardCursorPagination
from annotaise.user_llm_key import pop_user_llm_key

from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from user.permissions import IsAdminAccount
from django.http import HttpResponse
from .permissions import CanAnswerLabelingPermission
from labeling.permissions import CanEditLabelingsInProjectPermission
from .services.submit_answer import (
    DecisionInputError,
    NoGroupSlotAvailable,
    submit_answer,
)

import pandas as pd

from rest_framework.generics import ListAPIView
from django.db.models import F, Q
from django.db import transaction
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.views.decorators.debug import sensitive_variables
#TODO aqui é melhor usar permission pra ver se o item membership existe!
class AnswerViewset(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'delete']
    serializer_class = AnswerSerializer
    permission_classes = [IsAdminAccount]

    def get_permissions(self):

        if self.action in ['create']:
            perm = [CanAnswerLabelingPermission()]
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
        # Chave de IA do modo "só nesta sessão": sai da requisição já aqui,
        # antes de qualquer outro processamento. Ver annotaise/user_llm_key.py.
        session_llm_key = pop_user_llm_key(request)

        user = request.user
        data = request.data

        item_id = data.get('item')
        item = get_object_or_404(Item, pk=item_id)

        # Garante que o usuário tenha membership nesse item TODO isso era pra trr na permission... T-T
        membership = ItemMembership.objects.filter(
            user=user,
            item_id=item_id,
        ).first()
        if not membership:
            return Response(
                {'detail': 'Você não pode responder a esse item da rotulação.'},
                status=403
        )
        # TODO eu acho que esse finished era pra tar no enum...
        if item.status == 'finished':
            return Response(
                {'detail': 'Esse item já foi finalizado e não pode mais receber respostas.'},
                status=403
        )

        labeling:Labeling = item.labeling
        if labeling.has_background_form and not BackgroundAnswer.objects.filter(
            labeling=labeling,
            answered_by=user,
        ).exists():
            return Response(
                {
                    "detail": "Você precisa responder o formulário background antes de rotular.",
                    "code": "BACKGROUND_REQUIRED",
                },
                status=403,
            )

        serializer = self.get_serializer(data=data, context={'request':request})
        serializer.is_valid(raise_exception=True)

        try:
            result = submit_answer(
                user=user,
                item=item,
                membership=membership,
                answer_payload=serializer.validated_data.get("answer_payload", {}),
                session_llm_key=session_llm_key,
            )
        except DecisionInputError as exc:
            return Response({'detail': str(exc)}, status=400)
        except NoGroupSlotAvailable as exc:
            return Response({'detail': str(exc), 'code': 'NO_GROUP_SLOT'}, status=409)

        response_data = self.get_serializer(result.answer).data
        if result.decision_warning:
            response_data = {**response_data, "decision_warning": result.decision_warning}

        return Response(
            response_data,
            status=201,
            headers=self.get_success_headers(response_data),
        )

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
    Submissão pública/anônima de respostas para rotulações em modo anônimo.

    Identifica a rotulação pelo token da URL e dispensa autenticação e
    verificações de usuário/membership. A resposta é gravada sem autor
    (answered_by=None). Como no modo anônimo assume-se users_per_item=1
    (cada visitante responde um item uma única vez), o item é marcado como
    finalizado assim que recebe uma resposta — exceto em form_mode, em que os
    itens permanecem abertos.
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

        # users_per_item == 1 no modo anônimo: uma resposta já finaliza o item.
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
    # A tela lista as respostas na ordem das linhas do CSV. O cursor não aceita
    # lookups com "__", então row_index chega anotado do item (ver get_queryset).
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
        perm = CanEditLabelingsInProjectPermission()
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
        if not LabelingMembership.objects.filter(
            labeling=labeling,
            user=request.user,
        ).exists():
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
        perm = CanEditLabelingsInProjectPermission()
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
                and answer.answered_by.username == "llm_tiebreak_bot"
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

        # Gera o conteúdo do CSV como *string*, sem salvar em arquivo
        csv_data = df.to_csv(index=False)

        response = HttpResponse(csv_data, content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="exported_answers_{labeling.title}.csv"'
        )
        return response
