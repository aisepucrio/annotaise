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

from .models import Invitation
from .permissions import IsAdminAccount, IsMasterAdminAccount
from .serializers import (
    AdminUserReadSerializer,
    AdminUserWriteSerializer,
    CustomUserSerializer,
    InvitationSerializer,
)

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

    def delete(self, request, *args, **kwargs):
        target_user = self.get_object()

        if target_user.account_type == "admin" and target_user != request.user:
            # verifica se QUEM ESTÁ FAZENDO A REQUISIÇÃO é master admin
            if not IsMasterAdminAccount().has_permission(request, self):
                raise PermissionDenied("Apenas um master admin pode deletar outro admin.")

        return super().delete(request, *args, **kwargs)


    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return AdminUserWriteSerializer
        elif self.action == "dashboard":
            return 
        return AdminUserReadSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # estatísticas agregadas para admins
        qs = qs.annotate(
            projects_count=Count("project_memberships", distinct=True),
            labelings_total=Count("labeling_memberships", distinct=True),
            answers_count=Count("answers_given", distinct=True),
            pending_items_count=Count(
                "labeling_memberships__labeling__items__memberships",
                filter=Q(
                    labeling_memberships__labeling__items__status="pending",
                    labeling_memberships__labeling__items__memberships__user_id=F("id")

                )
                & ~Q(labeling_memberships__labeling__items__answers__answered_by_id=F("id")),
                distinct=True,
            ),
        )
        return qs
    

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
    

    def create(self, request, *args, **kwargs):
        '''apos a criação do convite é enviado um email com o token para o email convidado'''
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data.get("email",None) 
        print(f"EMAIL : {email}")
        if User.objects.filter(email=email).exists():
            return Response({"detail": "Usuário com esse email já existe.","code":"EMAIL_ALREADY_EXISTS"},status=400)

        invitation = serializer.save(invited_by=request.user)
        link = FRONTEND_URL + f"/accept-invitation/{invitation.token}"
        
        send_invitation_email(invitation,link)

        headers = self.get_success_headers(serializer.data)
        return Response({"link": link, "invitation": serializer.data}, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=["post"], url_path="accept/(?P<token>[^/.]+)")
    def accept_invitation(self, request, token=None):
        invitation = get_object_or_404(Invitation, token=token, is_used=False)

        if invitation.expires_at < timezone.now():
            return Response({"detail": "Convite expirado.","code":"EXPIRED_INVITE"}, status=status.HTTP_400_BAD_REQUEST)

        user_id = uuid.uuid4()          
        user_id_str = user_id.hex

        user = User.objects.create_user(
            username=user_id_str,
            email=invitation.email,
            first_name=request.data.get("first_name", ""),
            last_name=request.data.get("last_name", ""),
            account_type=invitation.role,
            password=request.data.get("password"),
        )

        invitation.is_used = True
        invitation.save()

        serializer = CustomUserSerializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class UserGroupViewset(viewsets.ModelViewSet):
    http_method_names = ['get','delete','post','patch']
    permission_classes = [IsAdminAccount]
    #TODO talvez seja valido depois colocar uma permissão aqui pra não permitir deletar/ editar grupo dos outros
