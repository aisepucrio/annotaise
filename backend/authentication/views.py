from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from user.serializers import CustomUserSerializer, CustomUserCreateSerializer
from rest_framework import status
from drf_spectacular.utils import extend_schema
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .serializers import CustomTokenObtainPairSerializer, ForgotPasswordSerializer, ResetPasswordSerializer, EmailTokenObtainSerializer
from django.conf import settings
from rest_framework.permissions import AllowAny
from .models import PasswordResetToken
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)

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

class ForgotPasswordView(APIView):
   permission_classes = [AllowAny]

   @extend_schema(request=ForgotPasswordSerializer, responses={200: None})
   def post(self, request):
       ser = ForgotPasswordSerializer(data=request.data)
       ser.is_valid(raise_exception=True)

       email = ser.validated_data['email']
       User = get_user_model()

       try:
           user = User.objects.get(email=email)
       except User.DoesNotExist:
           return Response({"detail": "Esse email não está atribuído a nenhum usuário."}, status=status.HTTP_400_BAD_REQUEST)

       PasswordResetToken.objects.filter(user=user, used=False).update(used=True)

       reset_token = PasswordResetToken.objects.create(user=user)

       reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token.token}"

       try:
           send_mail(
               subject="Recuperação de senha",
               message=f"Clique no link para redefinir sua senha: {reset_link}\n\nO link expira em 2 horas.",
               from_email=settings.DEFAULT_FROM_EMAIL,
               recipient_list=[email],
           )
           logger.info(f"Password reset email sent to {email}")
       except Exception as e:
           logger.error(f"Failed to send password reset email to {email}: {str(e)}")

       return Response({"detail": "Se o email existir, você receberá um link."}, status=status.HTTP_200_OK)

class ResetPasswordView(APIView):
   permission_classes = [AllowAny]

   @extend_schema(request=ResetPasswordSerializer, responses={200: None})
   def post(self, request):
       ser = ResetPasswordSerializer(data=request.data)
       ser.is_valid(raise_exception=True)

       try:
           reset_token = PasswordResetToken.objects.get(token=ser.validated_data['token'])
       except PasswordResetToken.DoesNotExist:
           return Response({"detail": "Token inválido."}, status=status.HTTP_400_BAD_REQUEST)

       if not reset_token.is_valid():
           return Response({"detail": "Token expirado ou já utilizado."}, status=status.HTTP_400_BAD_REQUEST)

       user = reset_token.user
       user.set_password(ser.validated_data['new_password'])
       user.save()

       reset_token.used = True
       reset_token.save()

       return Response({"detail": "Senha redefinida com sucesso."}, status=status.HTTP_200_OK)
