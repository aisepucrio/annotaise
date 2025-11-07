# views.py
from rest_framework.generics import RetrieveUpdateDestroyAPIView, UpdateAPIView, GenericAPIView
from rest_framework.permissions import IsAuthenticated
from .serializers import CustomUserSerializer
from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, filters
from .serializers import AdminUserReadSerializer, AdminUserWriteSerializer

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
    #permission_classes = [permissions.IsAdminUser] TODO adicionar permissão de admin para esse viewset
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["date_joined", "username", "email"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return AdminUserWriteSerializer
        return AdminUserReadSerializer
