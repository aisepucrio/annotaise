from item.models import ItemMembership
from annotaise.settings import FRONTEND_URL
from.utils import send_invitation_email

from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.contrib.auth import get_user_model
from django.db.models import Count, F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, OuterRef, Subquery, IntegerField

from django.db import connection, reset_queries
from django.db import transaction

from .models import Invitation
from .permissions import IsAdminAccount, IsMasterAdminAccount
from .serializers import (
    AdminUserReadSerializer,
    AdminUserWriteSerializer,
    CustomUserSerializer,
    InvitationSerializer,
)
from project.models import ProjectMembership

import uuid

#TODO falta um endpoint de alterar a senha... caso não tenha questoes de segurança, tem como fazer por aqui, mas nao é o ideal
class CurrentAPIView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CustomUserSerializer
    http_method_names = ["get", "patch","delete"] #TODO deixei o delete mas não é o ideal... talvez seja melhor desativar a conta 

    def get_object(self):
        return self.request.user


User = get_user_model()

class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-date_joined")
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
        elif self.action == "dashboard":
            return AdminUserReadSerializer
        return AdminUserReadSerializer

    @action(detail=False, methods=["get"], url_path="dashboard")
    def user_dashboard(self, request, pk=None):
        # Cada subquery é executada de forma independente e otimizada
        
        pending_items_sq = ItemMembership.objects.filter(
            item__labeling__memberships__user_id=OuterRef('id'),
            user_id=OuterRef('id')  # memberships do próprio usuário
        ).values('user_id').annotate(
            count=Count('id', distinct=True)
        ).values('count')
        
        qs = self.get_queryset().annotate(
            projects_count=Count("project_memberships", distinct=True),
            labelings_total=Count("labeling_memberships", distinct=True),
            answers_count=Count("answers_given", distinct=True),
            pending_items_count=Subquery(
                pending_items_sq,
                output_field=IntegerField()
            )
        )
        
        qs = self.filter_queryset(qs)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)
            
    

class InvitationViewSet(viewsets.ModelViewSet):
    queryset = Invitation.objects.all().order_by("-created_at")
    permission_classes = [IsAdminAccount]
    serializer_class = InvitationSerializer
    http_method_names = ['get', 'post', 'delete']
    lookup_field = "token"

    def get_permissions(self):
        if self.action in ["create", "destroy", "list"]:
            permission_classes = [IsAdminAccount]
        elif self.action in ["retrieve", "accept_invitation"]:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = self.permission_classes
        return [permission() for permission in permission_classes]

    def _create_or_get_pending_user(self, email: str, role: str):
        normalized_email = (email or "").strip().lower()
        existing_user = User.objects.filter(email__iexact=normalized_email).first()

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
            email=normalized_email,
            first_name="",
            last_name="",
            account_type=role,
            is_active=False,
            onboarding_status=User.OnboardingStatus.PENDING,
        )
        user.set_unusable_password()
        user.save(update_fields=["password"])
        return user, None

    def _assign_user_to_projects(self, request_user, target_user, project_ids):
        if not project_ids:
            return None

        valid_project_ids = []
        invalid_project_ids = []
        for raw_id in project_ids:
            try:
                valid_project_ids.append(int(raw_id))
            except (TypeError, ValueError):
                invalid_project_ids.append(raw_id)

        if invalid_project_ids:
            return Response(
                {
                    "detail": "Há project_ids inválidos.",
                    "code": "INVALID_PROJECT_IDS",
                    "invalid_project_ids": invalid_project_ids,
                },
                status=400,
            )

        owner_project_ids = set(
            ProjectMembership.objects.filter(
                user=request_user,
                role=ProjectMembership.RoleChoices.OWNER,
                project_id__in=valid_project_ids,
            ).values_list("project_id", flat=True)
        )
        requested_project_ids = set(valid_project_ids)
        unauthorized_ids = sorted(requested_project_ids - owner_project_ids)
        if unauthorized_ids:
            return Response(
                {
                    "detail": "Você só pode vincular usuários a projetos onde é owner.",
                    "code": "PROJECT_ASSIGNMENT_FORBIDDEN",
                    "project_ids": unauthorized_ids,
                },
                status=403,
            )

        for project_id in owner_project_ids:
            membership, created = ProjectMembership.objects.get_or_create(
                project_id=project_id,
                user=target_user,
                defaults={"role": ProjectMembership.RoleChoices.CONTRIBUTOR},
            )
            if not created and membership.role == ProjectMembership.RoleChoices.VIEWER:
                membership.role = ProjectMembership.RoleChoices.CONTRIBUTOR
                membership.save(update_fields=["role"])

        return None

    def create(self, request, *args, **kwargs):
        '''apos a criação do convite é enviado um email com o token para o email convidado'''

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data.get("email", None)
        role = serializer.validated_data.get("role")
        project_ids = serializer.validated_data.get("project_ids", [])

        with transaction.atomic():
            user, err = self._create_or_get_pending_user(email, role)
            if err == "active_exists":
                return Response(
                    {"detail": "Usuário com esse email já existe.", "code": "EMAIL_ALREADY_EXISTS"},
                    status=400,
                )

            project_response = self._assign_user_to_projects(request.user, user, project_ids)
            if project_response is not None:
                return project_response

            invitation = serializer.save(invited_by=request.user, user=user)
        link = FRONTEND_URL + f"/accept-invitation/{invitation.token}"

        send_invitation_email(invitation, link)

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
    #TODO talvez seja valido depois colocar uma permissão aqui pra não permitir deletar/ editar grupo dos outros
