from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from user.serializers import CustomUserSerializer, CustomUserCreateSerializer
from rest_framework import status
from drf_spectacular.utils import extend_schema
from .serializers import EmailTokenObtainSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .serializers import CustomTokenObtainPairSerializer
from rest_framework.permissions import AllowAny

class RegisterAPIView(APIView):
    permission_classes = [AllowAny]
    @extend_schema(
        request=CustomUserCreateSerializer,         # corpo esperado
        responses={201: CustomUserSerializer},      # resposta
        examples=None)
    
    def post(self, request):
        ser = CustomUserCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        return Response(CustomUserSerializer(user).data, status=status.HTTP_201_CREATED)


class PublicCustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class PublicTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]