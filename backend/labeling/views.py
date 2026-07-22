from .models import Labeling, LabelingMembership, LabelingSection, LabelingElement, MultipleChoiceItem, QuestionRange
from .serializers import (LabelingSerializer, LabelingMembershipSerializer,
LabelingSectionsBulkCreateSerializer, LabelingSectionSerializer, LabelingDashboardSerializer, LabelingMembershipDashboardSerializer, LabelingAgreementSummarySerializer)
from project.models import ProjectMembership
from user.permissions import IsAdminAccount
from .permissions import CanEditLabelingsInProjectPermission
from item.models import Item
from user.models import UserGroup
from .serializers import LabelingElementSerializer

from django.shortcuts import render, get_object_or_404
from django.db import models, transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

from rest_framework import viewsets, status

from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from project.models import Project
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema
from datetime import datetime, timedelta
import json
from answer.models import BackgroundAnswer, Answer
from collections import defaultdict
from annotaise.pagination import StandardPageNumberPagination, paginated_response

LLM_TIEBREAK_USERNAME = "llm_tiebreak_bot"
LLM_TIEBREAK_EMAIL = "llm_tiebreak_bot@annotaise.local"

class LabelingViewSet(viewsets.ModelViewSet):
    serializer_class = LabelingSerializer
    
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_serializer_class(self):
        if self.action in ['dashboard','editdashboard']:
            return LabelingDashboardSerializer
        else: return LabelingSerializer
    
    def get_permissions(self):
        if self.action in ['create' ,'list_labeling_memberships']:
            self.permission_classes = [IsAdminAccount]
        elif self.action in ['update','partial_update', 'destroy']:
            self.permission_classes = [IsAdminAccount, CanEditLabelingsInProjectPermission]
        else:
            self.permission_classes = [IsAuthenticated]
        return super().get_permissions()
    
    def get_queryset(self):
        user = self.request.user

        return (
            Labeling.objects
            .filter(
                Q(project__memberships__user=user) |
                Q(memberships__user=user)
            )
            .distinct()
        )

    
    @action(methods=['get'], detail=False, url_path='dashboard/edit', pagination_class=StandardPageNumberPagination)
    def editdashboard(self, request):
        '''a ideia é que esse dashboard serve pra mostrar o dashboard pro admin, entao tem todos os labelings de todos os projetos
        que o usuario é admin ou owner.'''
        today = datetime.now().date()
        search = request.query_params.get("search")
        output = []
        qs = (Labeling.objects.filter(project__memberships__user=request.user)
            .select_related('project')
            .annotate(
                total_labelings=Count('items', distinct=True),
                done_labelings=Count(
                    'items',
                    filter=Q(items__status='finished'),
                    distinct=True),
                answers_collected=Count('answers', distinct=True),
            )
        )
        if not qs.exists():
            return paginated_response(self, output)

        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(project__name__icontains=search)
            )
        for element in qs:
            output.append({
                "id" : element.id,
                "labeling_name" : element.title,
                "project_name" : element.project.name,
                "total_days" : (element.final_date - element.start_date).days,
                "days_passed" : (today - element.start_date).days,
                "items_done" : element.done_labelings,
                "total_items" : element.total_labelings,
                "form_mode": bool(element.form_mode),
                "answers_collected": element.answers_collected,
            })
        return paginated_response(self, output)
    
    @action(methods=['get'], detail=True, url_path='memberships', pagination_class=StandardPageNumberPagination)
    def list_labeling_memberships(self,request, pk=None):
        labeling = get_object_or_404(Labeling,pk=pk)
        memberships = (
            LabelingMembership.objects
            .filter(labeling=labeling)
            .exclude(user__username=LLM_TIEBREAK_USERNAME)
            .exclude(user__email__iexact=LLM_TIEBREAK_EMAIL)
            .select_related('user')
        )
        background_users = set(
            BackgroundAnswer.objects.filter(labeling=labeling).values_list("answered_by_id", flat=True)
        )
        
        answers_done = dict(
            Answer.objects
            .filter(labeling=labeling)
            .values_list("answered_by_id")
            .annotate(total=Count("item", distinct=True))
            .values_list("answered_by_id", "total")
        )

        output = []
        for membership in memberships:
            output.append({
                "id": membership.id,
                "user": membership.user_id,
                "first_name": membership.user.first_name,
                "last_name": membership.user.last_name,
                "email": membership.user.email,
                "role": membership.role,
                "joined_at": membership.joined_at,
                "background_answered": membership.user_id in background_users,
                "items_done": answers_done.get(membership.user_id, 0),
            })
        
        return paginated_response(self, output, LabelingMembershipDashboardSerializer)


    def _user_can_answer_labeling(self, labeling, user, user_group_names):
        """
        True se ainda há ao menos um item pendente desta rotulação onde o
        usuário consegue preencher um grupo em aberto.

        Usa Item.remaining_groups_for (uma única query agregada para todos os
        itens) + Item._slot_open — a mesma regra da distribuição, mantendo
        dashboard e next-item em acordo.
        """
        items = list(
            Item.objects
            .filter(labeling=labeling, status__in=["pending", "in_progress"])
            .exclude(answers__answered_by=user)
        )
        if not items:
            return False
        remaining_by_item = Item.remaining_groups_for(labeling, items)
        return any(
            Item._slot_open(remaining, user_group_names)
            for remaining in remaining_by_item.values()
        )

    @action(methods=['get'], detail=False, url_path='dashboard', pagination_class=StandardPageNumberPagination)
    def dashboard(self, request):
        '''esse é o dashboard normal, que mostra os labelings dos projetos que o usuario participa em respostas. tirei os labelings que ja terminaram
        '''
        today = datetime.now().date()
        search = request.query_params.get("search")
        output = []

        items = (
            Item.objects
            .filter(
                status__in=["pending", "in_progress"],
            )
            .exclude(answers__answered_by=request.user)
            .values("labeling_id")
            .distinct()
        )

        qs = (
            Labeling.objects
            .filter(memberships__user=request.user, id__in=items)
            .select_related('project')
            .annotate(
                done_labelings=Count(
                    'answers',
                    filter=Q(answers__answered_by=request.user),
                    distinct=True),
                answers_collected=Count('answers', distinct=True),
            )
        )
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(project__name__icontains=search)
            )
        labeling_ids = list(qs.values_list("id", flat=True))
        background_answered_ids = set(
            BackgroundAnswer.objects.filter(
                answered_by=request.user,
                labeling_id__in=labeling_ids,
            ).values_list("labeling_id", flat=True)
        )
        # Grupos do usuário, pré-computados uma vez para avaliar elegibilidade
        # por grupo sem uma consulta por item.
        user_group_names = set(
            UserGroup.objects
            .filter(memberships__user=request.user)
            .values_list("name", flat=True)
        )
        for element in qs:
            # Em rotulações com cotas por grupo, só exibe se o usuário ainda
            # consegue preencher algum grupo em aberto em algum item — mesma
            # regra usada na distribuição (remaining_groups_for / _slot_open).
            if element.has_group_quotas and not self._user_can_answer_labeling(
                element, request.user, user_group_names
            ):
                continue
            background_answered = (
                not element.has_background_form
                or element.id in background_answered_ids
            )
            output.append({
                "id" : element.id,
                "labeling_name" : element.title,
                "project_name" : element.project.name,
                "total_days" : (element.final_date - element.start_date).days,
                "days_passed" : (today - element.start_date).days,
                "items_done" : element.done_labelings,
                "background_required": bool(element.has_background_form),
                "background_answered": background_answered,
                "form_mode": bool(element.form_mode),
                "answers_collected": element.answers_collected,
            })
        return paginated_response(self, output)
    
    def perform_create(self, serializer):
        user = self.request.user

        perm = CanEditLabelingsInProjectPermission()

        if perm.can_edit_labeling_by_project(user,self.request.data.get('project')) == False:
            raise PermissionDenied(detail=perm.message)
        serializer.save(created_by=user)

    @action(methods=["get"], detail=True, url_path="elements")
    def elements(self, request, pk=None):

        labeling_id = pk
        if not labeling_id:
            return Response(status=400, data={"detail":"labeling_id is required"})

        qs = LabelingElement.objects.filter(
            labeling_section__labeling_id=labeling_id,
            labeling_section__form_type=LabelingSection.FormType.MAIN,
        )

        type_qp = request.query_params.get("type")
        if type_qp:
            qs = qs.filter(question_type__icontains=type_qp)

        serializer = LabelingElementSerializer(
            qs, many=True, context=self.get_serializer_context()
        )
        return Response(serializer.data)

    @action(methods=["get"], detail=True, url_path="agreement-summary")
    def agreement_summary(self, request, pk=None):
        labeling = self.get_object()
        min_agreement = self._parse_min_agreement(request)

        elements = (
            LabelingElement.objects
            .filter(
                labeling_section__labeling=labeling,
                labeling_section__form_type=LabelingSection.FormType.MAIN,
                question_type=LabelingElement.QuestionType.MULTIPLE_CHOICE,
            )
            .prefetch_related("multiple_choice_items")
        )

        question_meta = {}
        for element in elements:
            options = [
                item.text
                for item in element.multiple_choice_items.all().order_by("order", "id")
                if item.text and item.text.strip()
            ]
            question_meta[element.id] = {
                "ordered_options": options,
                "option_set": set(options),
            }

        if not question_meta:
            serializer = LabelingAgreementSummarySerializer(
                data={
                    "min_agreement": min_agreement,
                    "max_min_agreement": 2,
                    "questions": [],
                }
            )
            serializer.is_valid(raise_exception=True)
            return Response(serializer.data, status=200)

        answers = (
            Answer.objects
            .filter(labeling=labeling)
            .order_by("-created_at", "-id")
            .values("item_id", "answered_by_id", "answer_payload")
        )

        latest_by_item_user = {}
        for answer in answers:
            answered_by_id = answer.get("answered_by_id")
            item_id = answer.get("item_id")
            if answered_by_id is None or item_id is None:
                continue
            key = (item_id, answered_by_id)
            if key not in latest_by_item_user:
                latest_by_item_user[key] = answer

        responders = {
            answer["answered_by_id"]
            for answer in latest_by_item_user.values()
            if answer.get("answered_by_id") is not None
        }
        annotator_count = (
            LabelingMembership.objects
            .filter(labeling=labeling, role=LabelingMembership.Role.ANNOTATOR)
            .values("user_id")
            .distinct()
            .count()
        )
        max_min_agreement = max(2, annotator_count, len(responders))
        if min_agreement > max_min_agreement:
            raise ValidationError(
                detail={
                    "detail": (
                        f"min_agreement deve estar entre 2 e {max_min_agreement} "
                        "para esta rotulação."
                    ),
                    "code": "INVALID_MIN_AGREEMENT",
                }
            )

        per_question = {
            question_id: {
                "item_responders": defaultdict(set),
                "option_users_by_item": defaultdict(lambda: defaultdict(set)),
                "other_present": False,
            }
            for question_id in question_meta.keys()
        }

        for answer in latest_by_item_user.values():
            payload = answer.get("answer_payload") or {}
            item_id = answer["item_id"]
            user_id = answer["answered_by_id"]

            for question_id, meta in question_meta.items():
                raw_value = self._resolve_payload_value(payload, question_id)
                normalized_choices = self._normalize_choice_values(raw_value)
                if not normalized_choices:
                    continue

                per_question[question_id]["item_responders"][item_id].add(user_id)
                selected_options = set()
                for choice in normalized_choices:
                    if choice in meta["option_set"]:
                        selected_options.add(choice)
                    else:
                        selected_options.add("__other__")
                        per_question[question_id]["other_present"] = True

                for option in selected_options:
                    per_question[question_id]["option_users_by_item"][item_id][option].add(user_id)

        output = []
        for question_id, meta in question_meta.items():
            state = per_question[question_id]
            possible_agreements = len(state["item_responders"])

            ordered_options = list(meta["ordered_options"])
            if state["other_present"]:
                ordered_options.append("__other__")

            options_output = []
            for option in ordered_options:
                agreement_count = 0
                for item_id, option_users in state["option_users_by_item"].items():
                    users = option_users.get(option, set())
                    if len(users) >= min_agreement:
                        agreement_count += 1

                options_output.append({
                    "key": option,
                    "label": option,
                    "agreement_count": agreement_count,
                })

            output.append({
                "question_id": question_id,
                "possible_agreements": possible_agreements,
                "options": options_output,
            })

        serializer = LabelingAgreementSummarySerializer(
            data={
                "min_agreement": min_agreement,
                "max_min_agreement": max_min_agreement,
                "questions": output,
            }
        )
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data, status=200)

    def _parse_min_agreement(self, request):
        raw_value = request.query_params.get("min_agreement")
        if raw_value in (None, ""):
            return 2

        try:
            parsed_value = int(raw_value)
        except (TypeError, ValueError):
            raise ValidationError(
                detail={
                    "detail": "min_agreement deve ser um número inteiro.",
                    "code": "INVALID_MIN_AGREEMENT",
                }
            )

        if parsed_value < 2:
            raise ValidationError(
                detail={
                    "detail": "min_agreement deve ser maior ou igual a 2.",
                    "code": "INVALID_MIN_AGREEMENT",
                }
            )

        return parsed_value

    def _resolve_payload_value(self, payload, question_id):
        if not isinstance(payload, dict):
            return None

        question_key = str(question_id)
        if question_key in payload:
            return payload.get(question_key)

        if question_id in payload:
            return payload.get(question_id)

        return None

    def _normalize_choice_values(self, value):
        entries = value if isinstance(value, list) else [value]
        normalized = []
        for entry in entries:
            if entry is None:
                continue
            if isinstance(entry, bool):
                normalized.append("true" if entry else "false")
                continue
            text = str(entry).strip()
            if not text:
                continue
            lowered = text.lower()
            if lowered in {"true", "false"}:
                normalized.append(lowered)
            else:
                normalized.append(text)
        # deduplica escolhas duplicadas na mesma resposta
        return list(dict.fromkeys(normalized))

class LabelingMembershipViewSet(viewsets.ModelViewSet):
    '''Só o owner/colaborator pode mexer nisso'''
    serializer_class = LabelingMembershipSerializer
    permission_classes = [IsAdminAccount, CanEditLabelingsInProjectPermission]
    queryset = (
        LabelingMembership.objects
        .select_related('labeling', 'user')
        .exclude(user__username=LLM_TIEBREAK_USERNAME)
        .exclude(user__email__iexact=LLM_TIEBREAK_EMAIL)
    )
    http_method_names = ['get', 'post', 'patch', 'delete']

    
    def get_queryset(self):
        user = getattr(self.request, "user", None)
        username = getattr(user, "username", "anonymous")

        if not user or not getattr(user, "is_authenticated", False):
            return self.queryset.none()

        # Filtra memberships de labelings onde o usuário é owner/contributor do projeto
        return (
            self.queryset.filter(
                Q(labeling__project__memberships__user=user,
                  labeling__project__memberships__role__in=[ProjectMembership.RoleChoices.OWNER, ProjectMembership.RoleChoices.CONTRIBUTOR]) |
                Q(labeling__created_by=user)
            )
            .distinct()
        )

class CreateReadLabelingStructureView(APIView):
    def _resolve_form_type(self, request):
        form_type = request.query_params.get("form_type", LabelingSection.FormType.MAIN)
        allowed = {
            LabelingSection.FormType.MAIN,
            LabelingSection.FormType.BACKGROUND,
        }
        if form_type not in allowed:
            raise ValidationError(
                detail={
                    "detail": "form_type inválido. Use 'main' ou 'background'.",
                    "code": "INVALID_FORM_TYPE",
                }
            )
        return form_type

    def get_permissions(self):
        if self.request.method in ['GET']:# TODO isso aqui tem que ser retirado mas acho que vai quebrar o frontend
            return [IsAuthenticated()]
        return [IsAdminAccount()]

    @extend_schema(
        responses={200: [LabelingSectionSerializer]},      # resposta
        examples=None)    
    def get(self, request, labeling_id):
        labeling = get_object_or_404(Labeling, id=labeling_id)
        form_type = self._resolve_form_type(request)
        if (
            form_type == LabelingSection.FormType.BACKGROUND
            and not labeling.has_background_form
        ):
            return Response([], status=status.HTTP_200_OK)
        sections = LabelingSection.objects.filter(labeling=labeling, form_type=form_type)
        out = LabelingSectionSerializer(sections, many=True).data
        return Response(out, status=status.HTTP_200_OK)

    @extend_schema(
        request=LabelingSectionsBulkCreateSerializer,         # corpo esperado
        responses={200: [LabelingSectionSerializer]},      # resposta
        examples=None)
    @transaction.atomic # importante pra se der problema nao deletar o que ja existe
    def put(self, request, labeling_id):
        labeling = get_object_or_404(Labeling, id=labeling_id)
        form_type = self._resolve_form_type(request)
        if (
            form_type == LabelingSection.FormType.BACKGROUND
            and not labeling.has_background_form
        ):
            return Response(
                {
                    "detail": "Esta rotulação não está configurada com formulário background.",
                    "code": "BACKGROUND_DISABLED",
                },
                status=400,
            )

        perm = CanEditLabelingsInProjectPermission()
        if not perm.can_edit_labeling(request.user, labeling_id):
            raise PermissionDenied(detail=perm.message)


        serializer = LabelingSectionsBulkCreateSerializer(
            data=request.data,
            context={
                'request': request,
                'labeling': labeling,
            }
        )
        
        if not serializer.is_valid():
            return Response({"detail":"estrutura do form inválida. cheque possiveis erros ou campos vazios","code":"INVALID_FORM_STRUCTURE"},status=400)
    

        sections_data = serializer.validated_data.get("sections", [])

        existing_sections_qs = LabelingSection.objects.filter(
            labeling=labeling,
            form_type=form_type,
        ).prefetch_related(
            "elements__multiple_choice_items", "elements__question_range"
        )
        existing_sections = {sec.id: sec for sec in existing_sections_qs}
        sections_to_keep = set()
        created_sections = []

        # Libera as ordens atuais para evitar colisão de constraint
        # usa um deslocamento pequeno para liberar ordens sem estourar smallint
        temp_offset = 1000
        for idx, sec in enumerate(existing_sections_qs):
            sec.order = temp_offset + idx
            sec.save(update_fields=["order"])
            # idem para elementos da seção
            for el_idx, el in enumerate(sec.elements.all()):
                el.order = temp_offset + el_idx
                el.save(update_fields=["order"])

        for idx, section_data in enumerate(sections_data):
            elements_data = section_data.pop("elements", [])
            section_id = section_data.pop("id", None)
            section_order = section_data.pop("order", None)
            if section_order is None:
                section_order = idx + 1  # fallback: mantém 1-based sequencial

            if section_id and section_id in existing_sections:
                section = existing_sections[section_id]
                for attr, value in section_data.items():
                    setattr(section, attr, value)
                section.order = section_order
                section.save()
            else:
                section = LabelingSection.objects.create(
                    labeling=labeling,
                    form_type=form_type,
                    order=section_order,
                    **section_data
                )
            sections_to_keep.add(section.id)
            created_sections.append(section)

            existing_elements = {el.id: el for el in section.elements.all()}
            elements_to_keep = set()
            follow_up_order_counter = 10000

            for element_idx, element_data in enumerate(elements_data):
                mc_items_data = element_data.pop("multiple_choice_items", [])
                range_data = element_data.pop("question_range", None)
                element_id = element_data.pop("id", None)
                element_data.pop("order", None)  # evitar duplicação
                element_order = element_idx + 1  # idem: 1-based sequencial

                if element_id and element_id in existing_elements:
                    element = existing_elements[element_id]
                    for attr, value in element_data.items():
                        setattr(element, attr, value)
                    element.order = element_order
                    element.save()
                else:
                    element = LabelingElement.objects.create(
                        labeling_section=section,
                        order=element_order,
                        **element_data
                    )
                elements_to_keep.add(element.id)

                # atualiza range
                if range_data is not None:
                    if hasattr(element, "question_range"):
                        for attr, value in range_data.items():
                            setattr(element.question_range, attr, value)
                        element.question_range.save()
                    else:
                        QuestionRange.objects.create(labeling_element=element, **range_data)
                else:
                    if hasattr(element, "question_range"):
                        element.question_range.delete()

                # ressincroniza múltipla escolha recriando (simplifica)
                # remove old follow-up elements before deleting items
                old_follow_up_ids = list(
                    element.multiple_choice_items
                    .filter(follow_up_question__isnull=False)
                    .values_list("follow_up_question_id", flat=True)
                )
                element.multiple_choice_items.all().delete()
                if old_follow_up_ids:
                    LabelingElement.objects.filter(id__in=old_follow_up_ids).delete()
                for item_data in mc_items_data:
                    follow_up_data = item_data.pop('follow_up_question', None)
                    follow_up_element = None

                    if follow_up_data:
                        follow_up_data.pop('id', None)
                        follow_up_data.pop('order', None)
                        fu_mc_items = follow_up_data.pop('multiple_choice_items', [])
                        fu_range = follow_up_data.pop('question_range', None)
                        follow_up_order_counter += 1
                        follow_up_element = LabelingElement.objects.create(
                            labeling_section=section,
                            order=follow_up_order_counter,
                            **follow_up_data,
                        )
                        for fu_item in fu_mc_items:
                            MultipleChoiceItem.objects.create(
                                labeling_element=follow_up_element,
                                **fu_item,
                            )
                        if fu_range is not None:
                            QuestionRange.objects.create(
                                labeling_element=follow_up_element,
                                **fu_range,
                            )

                    MultipleChoiceItem.objects.create(
                        labeling_element=element,
                        follow_up_question=follow_up_element,
                        **item_data,
                    )
                    if follow_up_element:
                        elements_to_keep.add(follow_up_element.id)

            # remove elementos não enviados
            to_delete_elements = [el_id for el_id in existing_elements.keys() if el_id not in elements_to_keep]
            if to_delete_elements:
                LabelingElement.objects.filter(id__in=to_delete_elements).delete()

        # remove seções não enviadas
        to_delete_sections = [sec_id for sec_id in existing_sections.keys() if sec_id not in sections_to_keep]
        if to_delete_sections:
            LabelingSection.objects.filter(id__in=to_delete_sections).delete()

        out = LabelingSectionSerializer(created_sections, many=True).data

        return Response(out, status=status.HTTP_200_OK)
        
