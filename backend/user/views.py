from .querysets import  UserQuerySet
from annotaise.settings import FRONTEND_URL
from.utils import send_invitation_email

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from annotaise.pagination import StandardCursorPagination, paginated_response

from django.contrib.auth import get_user_model
from django.db.models import Count, F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, OuterRef, Subquery, IntegerField

from django.db import connection, reset_queries
from django.db import transaction

from .models import Invitation, UserGroup, UserGroupMembership
from .permissions import IsAdminAccount, IsMasterAdminAccount
from .serializers import (
    AdminUserReadSerializer,
    AdminUserWriteSerializer,
    CustomUserSerializer,
    InvitationSerializer,
    UserGroupMembershipSerializer,
    UserGroupSerializer,
)
from project.models import ProjectMembership
from labeling.models import Labeling, LabelingMembership

import uuid

LLM_TIEBREAK_USERNAME = "llm_tiebreak_bot"
LLM_TIEBREAK_EMAIL = "llm_tiebreak_bot@annotaise.local"

class CurrentAPIView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CustomUserSerializer
    http_method_names = ["get", "patch","delete"] #TODO deixei o delete mas não é o ideal... talvez seja melhor desativar a conta 

    def get_object(self):
        return self.request.user


User = get_user_model()

class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = (
        User.objects
        .exclude(username=LLM_TIEBREAK_USERNAME)
        .exclude(email__iexact=LLM_TIEBREAK_EMAIL)
        .order_by("-date_joined")
    )
    permission_classes = [IsAdminAccount]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["date_joined", "username", "email"]
    http_method_names = ['get', 'post', 'patch', 'delete']

    def partial_update(self, request, *args, **kwargs):
        target_user = self.get_object()

        if target_user.account_type == "admin" and target_user != request.user:
            # verifica se QUEM ESTÁ FAZENDO A REQUISIÇÃO é master admin
            if not IsMasterAdminAccount().has_permission(request, self):
                raise PermissionDenied("Apenas um master admin pode alterar dados de outro admin.")

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        target_user = self.get_object()

        if target_user.account_type == "admin" and target_user != request.user:
            # verifica se QUEM ESTÁ FAZENDO A REQUISIÇÃO é master admin
            if not IsMasterAdminAccount().has_permission(request, self):
                raise PermissionDenied("Apenas um master admin pode deletar outro admin.")

        return super().destroy(request, *args, **kwargs)


    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return AdminUserWriteSerializer
        elif self.action == "user_dashboard":
            return AdminUserReadSerializer
        return AdminUserReadSerializer

    @action(detail=False, methods=["get"], url_path="dashboard", pagination_class=StandardCursorPagination)
    def user_dashboard(self, request, pk=None):
        # Cada subquery é executada de forma independente e otimizada
        #Parte comentada vai embora, pois sua lógica está em querysets.py
        '''pending_items_sq = ItemMembership.objects.filter(
            item__labeling__memberships__user_id=OuterRef('id'),
            user_id=OuterRef('id')  # memberships do próprio usuário
        ).values('user_id').annotate(
            count=Count('id', distinct=True)
        ).values('count')'''
        
        '''qs = self.get_queryset().annotate(
            projects_count=Count("project_memberships", distinct=True),
            labelings_total=Count("labeling_memberships", distinct=True),
            answers_count=Count("answers_given", distinct=True),
            pending_items_count=Subquery(
                pending_items_sq,
                output_field=IntegerField()
            )
        )'''
        qs = self.get_queryset().annotate()
        qs = self.filter_queryset(qs)
        return paginated_response(self, qs)
            
    

class InvitationViewSet(viewsets.ModelViewSet):
    queryset = Invitation.objects.all().order_by("-created_at")
    permission_classes = [IsAdminAccount]
    serializer_class = InvitationSerializer
    http_method_names = ['get', 'post', 'delete']
    lookup_field = "token"

    def get_permissions(self):
        if self.action in ["create", "destroy", "list", "assignment_options"]:
            permission_classes = [IsAdminAccount]
        elif self.action in ["retrieve", "accept_invitation"]:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = self.permission_classes
        return [permission() for permission in permission_classes]

    def _create_or_get_pending_user(self, email: str, role: str):
        #normalized_email = (email or "").strip().lower() 
        user_email = UserQuerySet.user_email
        existing_user = User.objects.user_email(email).first()

        if existing_user and existing_user.onboarding_status == User.OnboardingStatus.ACTIVE:
            return None, "active_exists"

        if existing_user:
            user = existing_user
            user.account_type = role
            user.is_active = False
            user.onboarding_status = User.OnboardingStatus.PENDING
            user.save(update_fields=["account_type", "is_active", "onboarding_status"])
            return user, None

        user_id = uuid.uuid4().hex
        user = User.objects.create(
            username=user_id,
            email=user_email,
            first_name="",
            last_name="",
            account_type=role,
            is_active=False,
            onboarding_status=User.OnboardingStatus.PENDING,
        )
        user.set_unusable_password()
        user.save(update_fields=["password"])
        return user, None

    def _parse_int_ids(self, raw_ids):
        valid_ids = []
        invalid_ids = []
        for raw_id in raw_ids or []:
            try:
                valid_ids.append(int(raw_id))
            except (TypeError, ValueError):
                invalid_ids.append(raw_id)
        return valid_ids, invalid_ids

    def _resolve_labeling_assignment_ids(self, request_user, project_ids, labeling_ids):
        valid_project_ids, invalid_project_ids = self._parse_int_ids(project_ids)
        if invalid_project_ids:
            return None, Response(
                {
                    "detail": "Há project_ids inválidos.",
                    "code": "INVALID_PROJECT_IDS",
                    "invalid_project_ids": invalid_project_ids,
                },
                status=400,
            )

        valid_labeling_ids, invalid_labeling_ids = self._parse_int_ids(labeling_ids)
        if invalid_labeling_ids:
            return None, Response(
                {
                    "detail": "Há labeling_ids inválidos.",
                    "code": "INVALID_LABELING_IDS",
                    "invalid_labeling_ids": invalid_labeling_ids,
                },
                status=400,
            )

        owner_project_ids = set(
            ProjectMembership.objects.filter(
                user=request_user,
                role=ProjectMembership.RoleChoices.OWNER,
            ).values_list("project_id", flat=True)
        )

        requested_project_ids = set(valid_project_ids)
        unauthorized_project_ids = sorted(requested_project_ids - owner_project_ids)
        if unauthorized_project_ids:
            return None, Response(
                {
                    "detail": "Você só pode atribuir usuários em projetos onde é owner.",
                    "code": "PROJECT_ASSIGNMENT_FORBIDDEN",
                    "project_ids": unauthorized_project_ids,
                },
                status=403,
            )

        requested_labeling_ids = set(valid_labeling_ids)
        requested_labeling_map = {
            item["id"]: item["project_id"]
            for item in Labeling.objects.filter(id__in=requested_labeling_ids).values("id", "project_id")
        }
        missing_labeling_ids = sorted(requested_labeling_ids - set(requested_labeling_map.keys()))
        if missing_labeling_ids:
            return None, Response(
                {
                    "detail": "Há labeling_ids inexistentes.",
                    "code": "LABELING_NOT_FOUND",
                    "labeling_ids": missing_labeling_ids,
                },
                status=400,
            )

        unauthorized_labeling_ids = sorted(
            labeling_id
            for labeling_id, project_id in requested_labeling_map.items()
            if project_id not in owner_project_ids
        )
        if unauthorized_labeling_ids:
            return None, Response(
                {
                    "detail": "Você só pode atribuir usuários em rotulações de projetos onde é owner.",
                    "code": "LABELING_ASSIGNMENT_FORBIDDEN",
                    "labeling_ids": unauthorized_labeling_ids,
                },
                status=403,
            )

        expanded_from_projects = set(
            Labeling.objects.filter(project_id__in=requested_project_ids).values_list("id", flat=True)
        )
        resolved_labeling_ids = expanded_from_projects | requested_labeling_ids
        return resolved_labeling_ids, None

    def _assign_user_to_labelings(self, target_user, labeling_ids):
        if not labeling_ids:
            return

        memberships = LabelingMembership.objects.filter(
            labeling_id__in=labeling_ids,
            user=target_user,
        )
        memberships_by_labeling = {membership.labeling_id: membership for membership in memberships}

        for labeling_id in labeling_ids:
            membership = memberships_by_labeling.get(labeling_id)
            if membership is None:
                LabelingMembership.objects.create(
                    labeling_id=labeling_id,
                    user=target_user,
                    role=LabelingMembership.Role.ANNOTATOR,
                )
                continue

            if membership.role == LabelingMembership.Role.VIEWER:
                membership.role = LabelingMembership.Role.ANNOTATOR
                membership.save(update_fields=["role"])

    @action(detail=False, methods=["get"], url_path="assignment-options")
    def assignment_options(self, request):
        owner_projects = (
            ProjectMembership.objects.filter(
                user=request.user,
                role=ProjectMembership.RoleChoices.OWNER,
            )
            .select_related("project")
            .order_by("project__name", "project__id")
        )
        owner_project_ids = [membership.project_id for membership in owner_projects]

        labelings_by_project = {}
        labelings_qs = (
            Labeling.objects.filter(project_id__in=owner_project_ids)
            .order_by("title", "id")
            .values("id", "title", "project_id")
        )
        for labeling in labelings_qs:
            labelings_by_project.setdefault(labeling["project_id"], []).append(
                {"id": labeling["id"], "title": labeling["title"]}
            )

        output = []
        for membership in owner_projects:
            project = membership.project
            output.append(
                {
                    "id": project.id,
                    "name": project.name,
                    "labelings": labelings_by_project.get(project.id, []),
                }
            )

        return Response({"projects": output}, status=200)

    def create(self, request, *args, **kwargs):
        '''apos a criação do convite é enviado um email com o token para o email convidado'''

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data.get("email", None)
        role = serializer.validated_data.get("role")
        project_ids = serializer.validated_data.get("project_ids", [])
        labeling_ids = serializer.validated_data.get("labeling_ids", [])
        email_language = serializer.validated_data.get("email_language", "pt-BR")

        with transaction.atomic():
            user, err = self._create_or_get_pending_user(email, role)
            if err == "active_exists":
                return Response(
                    {"detail": "Usuário com esse email já existe.", "code": "EMAIL_ALREADY_EXISTS"},
                    status=400,
                )

            resolved_labeling_ids, assignment_error = self._resolve_labeling_assignment_ids(
                request_user=request.user,
                project_ids=project_ids,
                labeling_ids=labeling_ids,
            )
            if assignment_error is not None:
                return assignment_error

            self._assign_user_to_labelings(user, resolved_labeling_ids)

            invitation = serializer.save(invited_by=request.user, user=user)
        link = FRONTEND_URL + f"/accept-invitation/{invitation.token}?lang={email_language}"

        send_invitation_email(invitation, link, language=email_language)

        headers = self.get_success_headers(serializer.data)
        return Response({"link": link, "invitation": serializer.data}, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=["post"], url_path="accept/(?P<token>[^/.]+)")
    def accept_invitation(self, request, token=None):
        invitation = get_object_or_404(Invitation, token=token, is_used=False)

        if invitation.expires_at < timezone.now():
            return Response({"detail": "Convite expirado.","code":"EXPIRED_INVITE"}, status=status.HTTP_400_BAD_REQUEST)

        user = invitation.user or User.objects.filter(email__iexact=invitation.email).first()
        if not user:
            user_id = uuid.uuid4()
            user = User.objects.create_user(
                username=user_id.hex,
                email=invitation.email,
                first_name="",
                last_name="",
                account_type=invitation.role,
                password=None,
            )

        user.first_name = request.data.get("first_name", "")
        user.last_name = request.data.get("last_name", "")
        user.account_type = invitation.role
        user.onboarding_status = User.OnboardingStatus.ACTIVE
        user.is_active = True
        if not user.username:
            user.username = uuid.uuid4().hex
        user.set_password(request.data.get("password"))
        user.save()

        invitation.is_used = True
        if invitation.user_id != user.id:
            invitation.user = user
            invitation.save(update_fields=["is_used", "user"])
        else:
            invitation.save(update_fields=["is_used"])

        serializer = CustomUserSerializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class UserGroupViewset(viewsets.ModelViewSet):
    http_method_names = ['get','delete','post','patch']
    permission_classes = [IsAdminAccount]
    serializer_class = UserGroupSerializer
    queryset = UserGroup.objects.all().order_by("name")

class UserGroupMembershipViewset(viewsets.ModelViewSet):
    http_method_names = ['get','delete','post','patch']
    permission_classes = [IsAdminAccount]
    serializer_class = UserGroupMembershipSerializer
    queryset = UserGroupMembership.objects.all().order_by("joined_at")
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["user", "group"]
