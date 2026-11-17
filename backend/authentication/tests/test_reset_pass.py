from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import PasswordResetToken

User = get_user_model()

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
