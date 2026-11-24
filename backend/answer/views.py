from .models import Answer, BackgroundAnswer
from item.models import ItemMembership, Item
from user.models import UserGroup
from .serializers import (
    AnswerSerializer,
    BackgroundAnswerSerializer,
)
from labeling.models import LabelingElement
from labeling.models import Labeling, LabelingMembership, LabelingSection
from annotaise.pagination import StandardCursorPagination

from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from user.permissions import IsAdminAccount
from django.http import HttpResponse
from .permissions import CanAnswerLabelingPermission, HasItemMembership
from labeling.permissions import CanEditLabelingPermission, can_annotate_labeling
from .services.llm_tiebreak import run_llm_tiebreak_decision

import pandas as pd

from rest_framework.generics import ListAPIView
from django.db.models import F, Q
from django.db import transaction
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from .services.submit_answer import NoGroupSlot, submit_anonymous_answer, LabelingFinished, ItemNotFound, ItemAlreadyFinished, submit_answer

#TODO better to use a permission class to check ItemMembership existence.

class AnswerViewset(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'delete']
    serializer_class = AnswerSerializer
    permission_classes = [IsAdminAccount]

    def get_permissions(self):
        if self.action == "create":
            return [CanAnswerLabelingPermission(), HasItemMembership()]
        return [IsAdminAccount()]

        
    def get_queryset(self):
        user = getattr(self.request, "user", None)

        if not user or not getattr(user, "is_authenticated", False):
            return Answer.objects.none()

        qs = Answer.objects.with_item()       

        labeling_id = self.request.query_params.get("labeling")
        if labeling_id and labeling_id.isdigit():
            qs = qs.for_labeling(int(labeling_id))
            #tudo de filter estará sendo migrado para querysets.py
            #Um arquivo novo por app. Filtro, anotação e ordenação de listagem viram métodos encadeáveis e nomeados.
        return qs

    def _get_or_create_llm_tiebreak_user(self):
        User = get_user_model()
        username = "llm_tiebreak_bot"
        email = "llm_tiebreak_bot@annotaise.local"

        user = User.objects.filter(username=username).first()
        if user:
            return user

        user = User.objects.filter(email__iexact=email).first()
        if user:
            if not user.username:
                user.username = username
                user.save(update_fields=["username"])
            return user

        user = User.objects.create(
            username=username,
            email=email,
            first_name="LLM",
            last_name="TieBreak",
            account_type="standard",
            is_active=True,
            onboarding_status="active",
        )
        user.set_unusable_password()
        user.save(update_fields=["password"])
        return user

    def _resolve_vote_winner(self, decision_dict):
        biggest = 0
        winner = None
        tied = False
        for answer, number_of_appearences in decision_dict.items():
            if number_of_appearences > biggest:
                biggest = number_of_appearences
                winner = answer
                tied = False
            elif number_of_appearences == biggest:
                tied = True
        return (winner is not None) and (not tied), winner

    def _build_llm_contexts(self, item):
        payload = item.payload if isinstance(item.payload, dict) else {}
        contexts = []
        context_elements = (
            LabelingElement.objects
            .filter(
                labeling_section__labeling=item.labeling,
                labeling_section__form_type=LabelingSection.FormType.MAIN,
                question_type=LabelingElement.QuestionType.CONTEXT,
            )
            .order_by("labeling_section__order", "order", "id")
        )

        for element in context_elements:
            value = None
            if element.column_name:
                value = payload.get(element.column_name)
            if value is None:
                value = payload.get(str(element.id), payload.get(element.id))

            contexts.append(
                {
                    "context_type": element.context_type or "text",
                    "label": element.text or element.column_name or f"contexto_{element.id}",
                    "column_name": element.column_name,
                    "value": value,
                }
            )

        return contexts

    def create(self, request, *args, **kwargs):
        user = request.user
        data = request.data

        item_id = data.get('item')
        item = get_object_or_404(Item,pk=item_id)

        # Ensures the user holds a membership for this item. TODO: this really belongs in the permission class... T-T
        membership = ItemMembership.objects.filter(
            user=user,
            item_id=item_id,
        ).first()
        if not membership:
            return Response(
                {'detail': 'Você não pode responder a esse item da rotulação.'},
                status=403
        )
        # TODO: I think 'finished' should really be part of the enum...
        if item.status == 'finished':
            return Response(
                {'detail': 'Esse item já foi finalizado e não pode mais receber respostas.'},
                status=403
        )

        labeling:Labeling = item.labeling
        if labeling.has_background_form and not BackgroundAnswer.objects.for_labeling(labeling.id).by_user(user.id).exists():
            return Response(
                {
                    "detail": "Você precisa responder o formulário background antes de rotular.",
                    "code": "BACKGROUND_REQUIRED",
                },
                status=403,
            )

        if labeling.decision == True and labeling.decisive_question is None:
            return Response(
                {'detail': 'Rotulação configurada para decisão, mas pergunta decisiva não definida. Contate o dono da rotulação.'},
                status=400
        )


        serializer = self.get_serializer(data=data, context={'request':request})
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data.get("answer_payload", {})
        decisive_answer = None
        if labeling.decision == True:
            decisive_element = labeling.decisive_question
            decisive_id = decisive_element.id

            # When validation is decision-based, check whether the required number
            # of answers to finish the labeling has been reached.
            answer_value = None
            if isinstance(payload, dict):
                answer_value = payload.get(str(decisive_id))
                if answer_value is None:
                    answer_value = payload.get(decisive_id)
            if answer_value is None:
                return Response(
                    {"detail": "Resposta da pergunta decisiva não encontrada."},
                    status=400,
                )
            decisive_answer = str(answer_value)

        try:
            result = submit_answer(
                user=user,
                item_id=item.id,
                membership=request.item_membership,
                create_answer=serializer.save,
                decisive_answer=decisive_answer,
            )
        except NoGroupSlot:
            return Response(
                {
                    "detail": "Os slots restantes deste item são reservados para outros grupos.",
                    "code": "NO_GROUP_SLOT",
                },
                status=409,
            )

        data = dict(serializer.data)
        if result.decision_warning:
            data["decision_warning"] = result.decision_warning
        return Response(data, status=201, headers=self.get_success_headers(serializer.data))

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
    user/membership checks. The rules live in submit_anonymous_answer.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, token):
        labeling = get_object_or_404(
            Labeling,
            anonymous_token=token,
            distribution_strategy=Labeling.DistributionStrategy.ANONYMOUS_MODE,
        )

        answer_payload = request.data.get("answer_payload", {})
        if not isinstance(answer_payload, dict):
            return Response({"answer_payload": "Formato inválido."}, status=400)

        try:
            answer = submit_anonymous_answer(
                labeling=labeling,
                item_id=request.data.get("item"),
                answer_payload=answer_payload,
            )
        except LabelingFinished:
            return Response(
                {"detail": "Essa rotulação já foi finalizada", "code": "ROTULACAO_FINALIZADA"},
                status=400,
            )
        except ItemNotFound:
            return Response(
                {"detail": "Item não encontrado para esta rotulação.", "item": "Item é obrigatório."},
                status=400,
            )
        except ItemAlreadyFinished:
            return Response(
                {"detail": "Esse item já foi finalizado e não pode mais receber respostas."},
                status=403,
            )

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

        qs = (Answer.objects.for_labeling(labeling_id)
            .with_dashboard_relations().with_row_index())
        
        answered_by = self.request.query_params.get("answered_by")

        if answered_by and answered_by.isdigit():
            qs = qs.answered_by(int(answered_by))

        return qs.in_row_order()


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

        answer = BackgroundAnswer.objects.for_labeling(labeling.id).by_user(request.user.id).first()
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

        qs = BackgroundAnswer.objects.for_labeling(labeling.id).with_author()
        user_id = request.query_params.get("user_id")
        if user_id and user_id.isdigit():
            qs = qs.by_user(int(user_id))


        data = BackgroundAnswerSerializer(qs, many=True).data
        return Response(data, status=200)


class ExportAnswersView(APIView):
    permission_classes = [IsAdminAccount]

    def get(self, request, **kwargs):
        labeling_id = kwargs.get("labeling_id")
        
        labeling = get_object_or_404(Labeling, id=labeling_id)
        answers = Answer.objects.for_labeling(labeling_id).for_export()

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

        # Builds the CSV content as a string, without writing to a file
        csv_data = df.to_csv(index=False)

        response = HttpResponse(csv_data, content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="exported_answers_{labeling.title}.csv"'
        )
        return response
