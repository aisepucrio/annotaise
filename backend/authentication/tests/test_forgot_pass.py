from django.contrib.auth import get_user_model
from django.test import TestCase
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