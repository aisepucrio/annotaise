from .models import Labeling, LabelingMembership, LabelingSection, LabelingElement, MultipleChoiceItem, QuestionRange
from .serializers import (LabelingSerializer, LabelingMembershipSerializer,
LabelingSectionsBulkCreateSerializer, LabelingSectionSerializer, LabelingDashboardSerializer, LabelingMembershipDashboardSerializer, LabelingAgreementSummarySerializer,
LabelingReliabilitySerializer)
from user.permissions import IsAdminAccount
from .permissions import CanEditLabelingPermission, IsLabelingOwnerPermission, EDIT_ROLES, ANNOTATE_ROLES
from item.models import Item
from user.models import UserGroup
from .serializers import LabelingElementSerializer
from .services.agreement import build_agreement_summary, build_reliability_report, parse_min_agreement

from django.shortcuts import render, get_object_or_404
from django.db import models, transaction
from django.utils import timezone

from rest_framework import viewsets, status

from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from project.models import Project
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, DateTimeField, OuterRef, Q, Subquery, Value
from django.db.models.functions import Coalesce
from drf_spectacular.utils import extend_schema
from datetime import datetime, timedelta, timezone as dt_timezone
import json
from answer.models import BackgroundAnswer, Answer
from collections import defaultdict
from annotaise.pagination import StandardCursorPagination, paginated_response

LLM_TIEBREAK_USERNAME = "llm_tiebreak_bot"
LLM_TIEBREAK_EMAIL = "llm_tiebreak_bot@annotaise.local"

LAST_OWNER_ERROR = "A rotulação precisa de pelo menos um dono."

# Position for labelings the user never opened: they sort to the end.
# Must be a concrete value rather than NULL — the cursor paginates by comparing
# the position with __lt/__gt, and a comparison against NULL is never true, so
# these rows would vanish starting on the second page.
NEVER_OPENED = datetime(1970, 1, 1, tzinfo=dt_timezone.utc)


class LabelingDashboardCursorPagination(StandardCursorPagination):
    """Annotator dashboard: most recently opened labeling comes first.

    The cursor position is `last_opened` (annotated in `dashboard`); `-id` only
    breaks ties within the same instant. Note that never-opened labelings share
    the NEVER_OPENED position, and offset-based tie-breaking in the cursor is
    valid up to `offset_cutoff` (1000) rows — comfortable for this listing,
    which only carries the user's labelings with pending items they haven't
    answered yet.
    """

    ordering = ("-last_opened", "-id")

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
        elif self.action == 'destroy':
            self.permission_classes = [IsAdminAccount, IsLabelingOwnerPermission]
        elif self.action in ['update','partial_update']:
            self.permission_classes = [IsAdminAccount, CanEditLabelingPermission]
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

    
    @action(methods=['get'], detail=False, url_path='dashboard/edit', pagination_class=StandardCursorPagination)
    def editdashboard(self, request):
        '''This dashboard is for the admin view: it lists all labelings across every
        project where the user is admin or owner.'''
        today = datetime.now().date()
        search = request.query_params.get("search")
        qs = (Labeling.objects.filter(memberships__user=request.user, memberships__role__in=EDIT_ROLES)
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
        # The folders shown on screen are the projects the user is a member of.
        # `ungrouped` returns the rest: labelings with no project, or in a project
        # the user isn't part of (permission today lives on the labeling itself).
        if request.query_params.get("ungrouped") == "true":
            qs = qs.exclude(project__memberships__user=request.user)
        else:
            project = request.query_params.get("project")
            if project and project.isdigit():
                qs = qs.filter(project_id=project)

        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(project__name__icontains=search)
            )

        def build_rows(page):
            return [{
                "id" : element.id,
                "labeling_name" : element.title,
                "project_name" : element.project.name if element.project else None,
                "total_days" : (element.final_date - element.start_date).days,
                "days_passed" : (today - element.start_date).days,
                "items_done" : element.done_labelings,
                "total_items" : element.total_labelings,
                "form_mode": bool(element.form_mode),
                "answers_collected": element.answers_collected,
            } for element in page]

        return paginated_response(self, qs, build_rows=build_rows)

    @action(methods=['get'], detail=True, url_path='memberships', pagination_class=StandardCursorPagination)
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
            Answer.objects.filter(labeling=labeling).done_count_by_user()
        )

        def build_rows(page):
            return [{
                "id": membership.id,
                "user": membership.user_id,
                "first_name": membership.user.first_name,
                "last_name": membership.user.last_name,
                "email": membership.user.email,
                "role": membership.role,
                "joined_at": membership.joined_at,
                "background_answered": membership.user_id in background_users,
                "items_done": answers_done.get(membership.user_id, 0),
            } for membership in page]

        return paginated_response(
            self, memberships, LabelingMembershipDashboardSerializer, build_rows=build_rows
        )



    def _user_can_answer_labeling(self, labeling, user, user_group_names):
        """
        True if this labeling still has at least one pending item where the
        user can fill an open group slot.

        Uses Item.remaining_groups_for (a single aggregated query for all
        items) + Item._slot_open — the same rule used by distribution, keeping
        the dashboard and next-item in agreement.
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

    @action(methods=['get'], detail=False, url_path='dashboard', pagination_class=LabelingDashboardCursorPagination)
    def dashboard(self, request):
        '''The regular dashboard: shows labelings from projects the user participates
        in as an annotator. Finished labelings are excluded.
        '''
        today = datetime.now().date()
        search = request.query_params.get("search")

        items = (
            Item.objects
            .filter(
                status__in=["pending", "in_progress"],
            )
            .exclude(answers__answered_by=request.user)
            .values("labeling_id")
            .distinct()
        )

        # Moment the user last opened each labeling. Scalar subquery over the
        # membership (one row per user/labeling) instead of Max over a
        # multi-valued relation: the cursor filter becomes a WHERE instead of a
        # HAVING, without multiplying rows in the Counts below.
        last_opened_at = Subquery(
            LabelingMembership.objects
            .filter(labeling=OuterRef('pk'), user=request.user)
            .values('last_opened_at')[:1]
        )

        qs = (
            Labeling.objects
            .filter(memberships__user=request.user, memberships__role__in=ANNOTATE_ROLES, id__in=items)
            .select_related('project')
            .annotate(
                done_labelings=Count(
                    'answers',
                    filter=Q(answers__answered_by=request.user),
                    distinct=True),
                answers_collected=Count('answers', distinct=True),
                last_opened=Coalesce(
                    last_opened_at,
                    Value(NEVER_OPENED, output_field=DateTimeField()),
                    output_field=DateTimeField(),
                ),
            )
        )
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(project__name__icontains=search)
            )

        def build_rows(page):
            labeling_ids = [element.id for element in page]
            background_answered_ids = set(
                BackgroundAnswer.objects.filter(
                    answered_by=request.user,
                    labeling_id__in=labeling_ids,
                ).values_list("labeling_id", flat=True)
            )
            # User's groups, pre-computed once to evaluate group eligibility
            # without a per-item query.
            user_group_names = set(
                UserGroup.objects
                .filter(memberships__user=request.user)
                .values_list("name", flat=True)
            )

            rows = []
            for element in page:
                # For labelings with group quotas, only show it if the user can
                # still fill an open group slot on some item — same rule used by
                # distribution (remaining_groups_for / _slot_open). Filtering
                # happens per page, so a page can come back with fewer rows than
                # page_size; infinite scroll still follows `next`.
                if element.has_group_quotas and not self._user_can_answer_labeling(
                    element, request.user, user_group_names
                ):
                    continue
                background_answered = (
                    not element.has_background_form
                    or element.id in background_answered_ids
                )
                rows.append({
                    "id" : element.id,
                    "labeling_name" : element.title,
                    "project_name" : element.project.name if element.project else None,
                    "total_days" : (element.final_date - element.start_date).days,
                    "days_passed" : (today - element.start_date).days,
                    "items_done" : element.done_labelings,
                    "background_required": bool(element.has_background_form),
                    "background_answered": background_answered,
                    "form_mode": bool(element.form_mode),
                    "answers_collected": element.answers_collected,
                })
            return rows

        return paginated_response(self, qs, build_rows=build_rows)

    def retrieve(self, request, *args, **kwargs):
        '''Opening a labeling always goes through here — both the answer screen
        (answer/background/guide) and the management screens fetch this detail
        before rendering. That's why this is where an "open" gets recorded,
        instead of a separate endpoint: it covers deep links, refreshes, and any
        new route for free.
        '''
        response = super().retrieve(request, *args, **kwargs)

        LabelingMembership.objects.filter(
            labeling_id=kwargs.get('pk'),
            user=request.user,
        ).update(last_opened_at=timezone.now())

        return response

    def perform_create(self, serializer):
        user = self.request.user

        perm = CanEditLabelingPermission()

        if self.request.data.get('project') and perm.can_edit_labeling_by_project(user,self.request.data.get('project')) == False:
            raise PermissionDenied(detail=perm.message)
        labeling = serializer.save(created_by=user)

        LabelingMembership.objects.create(
            labeling=labeling,
            user=user,
            role=LabelingMembership.Role.OWNER,
        )

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
        min_agreement = parse_min_agreement(request.query_params.get("min_agreement"))
        summary = build_agreement_summary(labeling, min_agreement)

        serializer = LabelingAgreementSummarySerializer(data=summary)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data, status=200)

    @action(methods=["get"], detail=True, url_path="reliability")
    def reliability(self, request, pk=None):
        '''Chance-corrected agreement. Separate from agreement-summary, which
        counts operational consensus per option and answers another question.'''
        report = build_reliability_report(self.get_object())

        serializer = LabelingReliabilitySerializer(data=report)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data, status=200)


class LabelingMembershipViewSet(viewsets.ModelViewSet):
    '''Only the owner/admin can touch this.'''
    serializer_class = LabelingMembershipSerializer
    permission_classes = [IsAdminAccount, CanEditLabelingPermission]
    queryset = (
        LabelingMembership.objects
        .select_related('labeling', 'user')
        .exclude(user__username=LLM_TIEBREAK_USERNAME)
        .exclude(user__email__iexact=LLM_TIEBREAK_EMAIL)
    )
    http_method_names = ['get', 'post', 'patch', 'delete']

    
    def perform_update(self, serializer):
        membership = serializer.instance
        new_role = serializer.validated_data.get("role", membership.role)
        if new_role != LabelingMembership.Role.OWNER and membership.is_last_owner():
            raise ValidationError({"role": LAST_OWNER_ERROR})
        serializer.save()

    def perform_destroy(self, instance):
        if instance.is_last_owner():
            raise ValidationError({"detail": LAST_OWNER_ERROR})
        instance.delete()

    def get_queryset(self):
        user = getattr(self.request, "user", None)
        username = getattr(user, "username", "anonymous")

        if not user or not getattr(user, "is_authenticated", False):
            return self.queryset.none()

        return (
            self.queryset.filter(
                Q(labeling__memberships__user=user,
                  labeling__memberships__role__in=EDIT_ROLES) |
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
        if self.request.method in ['GET']:# TODO this should be removed, but I think it'll break the frontend
            return [IsAuthenticated()]
        return [IsAdminAccount()]

    @extend_schema(
        responses={200: [LabelingSectionSerializer]},
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
        request=LabelingSectionsBulkCreateSerializer,
        responses={200: [LabelingSectionSerializer]},
        examples=None)
    @transaction.atomic # so a failure mid-write doesn't delete what already existed
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

        perm = CanEditLabelingPermission()
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

        # Free up the current orders to avoid a unique-constraint collision;
        # use a small offset so freeing the orders doesn't overflow smallint.
        temp_offset = 1000
        for idx, sec in enumerate(existing_sections_qs):
            sec.order = temp_offset + idx
            sec.save(update_fields=["order"])
            # same for the section's elements
            for el_idx, el in enumerate(sec.elements.all()):
                el.order = temp_offset + el_idx
                el.save(update_fields=["order"])

        for idx, section_data in enumerate(sections_data):
            elements_data = section_data.pop("elements", [])
            section_id = section_data.pop("id", None)
            section_order = section_data.pop("order", None)
            if section_order is None:
                section_order = idx + 1  # fallback: keeps a sequential 1-based order

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
                element_data.pop("order", None)  # avoid setting it twice
                element_order = element_idx + 1  # same: sequential 1-based order

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

                # resync multiple-choice items by recreating them (simpler than diffing)
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

            # remove elements not present in the submitted data
            to_delete_elements = [el_id for el_id in existing_elements.keys() if el_id not in elements_to_keep]
            if to_delete_elements:
                LabelingElement.objects.filter(id__in=to_delete_elements).delete()

        # remove sections not present in the submitted data
        to_delete_sections = [sec_id for sec_id in existing_sections.keys() if sec_id not in sections_to_keep]
        if to_delete_sections:
            LabelingSection.objects.filter(id__in=to_delete_sections).delete()

        out = LabelingSectionSerializer(created_sections, many=True).data

        return Response(out, status=status.HTTP_200_OK)
        
