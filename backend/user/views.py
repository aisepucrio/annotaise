from .serializers import CustomUserSerializer
from .serializers import AdminUserReadSerializer, AdminUserWriteSerializer
from .permissions import IsAdminAccount
from project.models import Project
from item.models import ItemMembership
from answer.models import Answer

from rest_framework.generics import RetrieveUpdateDestroyAPIView, UpdateAPIView, GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action

from django.contrib.auth import get_user_model
from .serializers import AdminUserReadSerializer, AdminUserWriteSerializer
from rest_framework.response import Response
from rest_framework import status
from .permissions import IsAdminAccount
from django.db.models import Count, Q, F

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