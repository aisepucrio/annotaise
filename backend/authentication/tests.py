from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import PasswordResetToken

User = get_user_model()

class ForgotPasswordTests(TestCase):

   def setUp(self):
       self.client = APIClient()
       self.user = User.objects.create_user(
           username="usuario_teste",
           email="teste@email.com",
           password="senha123"
       )
       self.url = "/api/auth/forgot-password/"

   def test_email_existente_retorna_200(self):
       response = self.client.post(self.url, {"email": "teste@email.com"}, format="json")
       self.assertEqual(response.status_code, status.HTTP_200_OK)

   def test_email_inexistente_retorna_200(self):
       response = self.client.post(self.url, {"email": "naoexiste@email.com"}, format="json")
       self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

   def test_token_criado_para_usuario_existente(self):
       self.client.post(self.url, {"email": "teste@email.com"}, format="json")
       self.assertTrue(PasswordResetToken.objects.filter(user=self.user).exists())

   def test_token_anterior_invalidado(self):
       token_antigo = PasswordResetToken.objects.create(user=self.user)
       self.client.post(self.url, {"email": "teste@email.com"}, format="json")
       token_antigo.refresh_from_db()
       self.assertTrue(token_antigo.used)

   def test_email_invalido_retorna_400(self):
       response = self.client.post(self.url, {"email": "nao-é-um-email"}, format="json")
       self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

class ResetPasswordTests(TestCase):

   def setUp(self):
       self.client = APIClient()
       self.user = User.objects.create_user(
           username="usuario_teste",
           email="teste@email.com",
           password="senha_antiga"
       )
       self.token = PasswordResetToken.objects.create(user=self.user)
       self.url = "/api/auth/reset-password/"

   def test_reset_com_token_valido(self):
       response = self.client.post(self.url, {
           "token": self.token.token,
           "new_password": "nova_senha123"
       }, format="json")
       self.assertEqual(response.status_code, status.HTTP_200_OK)
       self.user.refresh_from_db()
       self.assertTrue(self.user.check_password("nova_senha123"))

   def test_token_marcado_como_usado_apos_reset(self):
       self.client.post(self.url, {
           "token": self.token.token,
           "new_password": "nova_senha123"
       }, format="json")
       self.token.refresh_from_db()
       self.assertTrue(self.token.used)

   def test_token_invalido_retorna_400(self):
       response = self.client.post(self.url, {
           "token": "token-invalido",
           "new_password": "nova_senha123"
       }, format="json")
       self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

   def test_token_ja_usado_retorna_400(self):
       self.token.used = True
       self.token.save()
       response = self.client.post(self.url, {
           "token": self.token.token,
           "new_password": "nova_senha123"
       }, format="json")
       self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

   def test_token_expirado_retorna_400(self):
       self.token.created_at = timezone.now() - timedelta(hours=3)
       self.token.save()
       response = self.client.post(self.url, {
           "token": self.token.token,
           "new_password": "nova_senha123"
       }, format="json")
       self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

   def test_senha_muito_curta_retorna_400(self):
       response = self.client.post(self.url, {
           "token": self.token.token,
           "new_password": "12"
       }, format="json")
       self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)