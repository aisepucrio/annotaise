from annotaise.settings import FRONTEND_URL
#from.utils import send_invitation_email

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
#from django.db.models import Count, OuterRef, Subquery, IntegerField

from django.db import connection, reset_queries
#from django.db import transaction
from .querysets import UserQuerySet
from .models import Invitation, UserGroup, UserGroupMembership
from .permissions import IsAdminAccount, IsMasterAdminAccount
from user.services.create_invitation import create_invitation
from user.services.assignment_options import get_assignment_options
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
        qs = self.get_queryset.user_dashboard_qs() #using the function instead of empty annotate
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
    

    @action(detail=False, methods=["get"], url_path="assignment-options")
    def assignment_options(self, request):
        projects = get_assignment_options(user=request.user)
        return Response({"projects": projects}, status=200)

    def create(self, request, *args, **kwargs):

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = create_invitation(
            invited_by=request.user,
            email=serializer.validated_data.get("email"),
            role=serializer.validated_data.get("role"),
            project_ids=serializer.validated_data.get("project_ids", []),
            labeling_ids=serializer.validated_data.get("labeling_ids", []),
            email_language=serializer.validated_data.get("email_language"), 
        )

        invitation_serializer = self.get_serializer(result["invitation"])
        headers = self.get_success_headers(invitation_serializer.data)
        return Response({"link": result["link"], "invitation": invitation_serializer.data}, status=status.HTTP_201_CREATED, headers=headers,
        )

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
