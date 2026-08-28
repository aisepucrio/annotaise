"""CRUD da biblioteca de chaves de IA e o vínculo delas com a rotulação.

Cobre o caminho que passa pelos serviços de labeling/services/ai_credentials:
o segredo entra cifrado, sai só como key_hint, e a rotulação só consegue
apontar para credencial de quem está pedindo.
"""

import base64
import os

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils.timezone import now
from rest_framework import status
from rest_framework.test import APIClient

from annotaise.crypto import decrypt_secret, encrypt_secret
from project.models import Project, ProjectMembership

from .models import AICredential, Labeling

TEST_ENCRYPTION_KEY = base64.b64encode(os.urandom(32)).decode("ascii")

API_KEY = "sk-credencial-de-teste-00000001"
OTHER_API_KEY = "sk-credencial-de-teste-00000002"


@override_settings(AI_BYOK_ENCRYPTION_KEY=TEST_ENCRYPTION_KEY)
class AICredentialViewSetTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.owner = User.objects.create_user(
            username="cred_owner", email="owner@example.com", password="123", account_type="admin"
        )
        self.other = User.objects.create_user(
            username="cred_other", email="other@example.com", password="123", account_type="admin"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.owner)
        self.url = "/ai-credentials/"

    def _create(self, name="Minha conta OpenAI", api_key=API_KEY, provider="openai"):
        return self.client.post(
            self.url,
            {"name": name, "provider": provider, "api_key": api_key},
            format="json",
        )

    def _foreign_credential(self):
        return AICredential.objects.create(
            owner=self.other,
            name="Chave do outro",
            provider="openai",
            encrypted_api_key=encrypt_secret(OTHER_API_KEY),
            key_hint=OTHER_API_KEY[-4:],
        )

    def test_create_encrypts_the_key_and_returns_only_the_hint(self):
        response = self._create()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertNotIn("api_key", response.data)
        self.assertEqual(response.data["key_hint"], API_KEY[-4:])
        self.assertEqual(response.data["labelings_count"], 0)

        credential = AICredential.objects.get(pk=response.data["id"])
        self.assertEqual(credential.owner, self.owner)
        self.assertNotIn(API_KEY, credential.encrypted_api_key)
        self.assertEqual(decrypt_secret(credential.encrypted_api_key), API_KEY)

    def test_create_without_the_key_is_rejected(self):
        response = self.client.post(
            self.url, {"name": "Sem chave", "provider": "openai"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("api_key", response.data)

    def test_rename_keeps_the_stored_key(self):
        credential_id = self._create().data["id"]

        response = self.client.patch(
            f"{self.url}{credential_id}/", {"name": "Renomeada"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["name"], "Renomeada")
        credential = AICredential.objects.get(pk=credential_id)
        self.assertEqual(decrypt_secret(credential.encrypted_api_key), API_KEY)

    def test_replacing_the_key_updates_secret_and_hint(self):
        credential_id = self._create().data["id"]

        response = self.client.patch(
            f"{self.url}{credential_id}/", {"api_key": OTHER_API_KEY}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["key_hint"], OTHER_API_KEY[-4:])
        credential = AICredential.objects.get(pk=credential_id)
        self.assertEqual(decrypt_secret(credential.encrypted_api_key), OTHER_API_KEY)

    def test_list_only_shows_own_credentials(self):
        self._create()
        self._foreign_credential()

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [row["name"] for row in response.data]
        self.assertEqual(names, ["Minha conta OpenAI"])

    def test_cannot_touch_someone_elses_credential(self):
        foreign = self._foreign_credential()

        self.assertEqual(
            self.client.get(f"{self.url}{foreign.pk}/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.delete(f"{self.url}{foreign.pk}/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertTrue(AICredential.objects.filter(pk=foreign.pk).exists())

    @override_settings(AI_BYOK_ENCRYPTION_KEY=None)
    def test_without_server_key_the_endpoint_answers_503(self):
        response = self._create()

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["code"], "BYOK_ENCRYPTION_UNAVAILABLE")
        self.assertFalse(AICredential.objects.exists())


@override_settings(AI_BYOK_ENCRYPTION_KEY=TEST_ENCRYPTION_KEY)
class LabelingAIConfigActionTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.owner = User.objects.create_user(
            username="lab_owner", email="labowner@example.com", password="123", account_type="admin"
        )
        self.other = User.objects.create_user(
            username="lab_other", email="labother@example.com", password="123", account_type="admin"
        )
        self.project = Project.objects.create(name="Projeto", created_by=self.owner)
        ProjectMembership.objects.create(project=self.project, user=self.owner, role="owner")
        self.labeling = Labeling.objects.create(
            title="Rotulacao",
            created_by=self.owner,
            project=self.project,
            start_date=now().date(),
            final_date=now().date(),
        )
        self.credential = AICredential.objects.create(
            owner=self.owner,
            name="Minha conta",
            provider="openai",
            encrypted_api_key=encrypt_secret(API_KEY),
            key_hint=API_KEY[-4:],
        )
        self.url = f"/labelings/{self.labeling.pk}/ai-config/"
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def test_starts_unconfigured(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_configured"])
        self.assertIsNone(response.data["credential_id"])

    def test_link_and_unlink(self):
        response = self.client.post(
            self.url, {"credential": self.credential.pk}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(response.data["is_configured"])
        self.assertEqual(response.data["credential_id"], self.credential.pk)
        self.assertEqual(response.data["key_hint"], API_KEY[-4:])
        self.assertTrue(response.data["owned_by_me"])
        self.labeling.refresh_from_db()
        self.assertEqual(self.labeling.ai_credential, self.credential)

        self.assertEqual(
            self.client.delete(self.url).status_code, status.HTTP_204_NO_CONTENT
        )
        self.labeling.refresh_from_db()
        self.assertIsNone(self.labeling.ai_credential)
        # Desvincular não apaga a credencial.
        self.assertTrue(AICredential.objects.filter(pk=self.credential.pk).exists())

    def test_cannot_link_a_credential_from_another_user(self):
        foreign = AICredential.objects.create(
            owner=self.other,
            name="Chave do outro",
            provider="openai",
            encrypted_api_key=encrypt_secret(OTHER_API_KEY),
            key_hint=OTHER_API_KEY[-4:],
        )

        response = self.client.post(self.url, {"credential": foreign.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.labeling.refresh_from_db()
        self.assertIsNone(self.labeling.ai_credential)

    def test_project_member_who_is_not_owner_cannot_manage_the_config(self):
        ProjectMembership.objects.create(
            project=self.project, user=self.other, role="contributor"
        )
        self.client.force_authenticate(self.other)

        response = self.client.post(
            self.url, {"credential": self.credential.pk}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.labeling.refresh_from_db()
        self.assertIsNone(self.labeling.ai_credential)

    def test_outsider_does_not_even_see_the_labeling(self):
        """Fora do projeto o get_object já 404 — a rotulação nem é revelada."""
        self.client.force_authenticate(self.other)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_linked_labelings_are_counted_in_the_credential_list(self):
        self.client.post(self.url, {"credential": self.credential.pk}, format="json")

        response = self.client.get("/ai-credentials/")

        self.assertEqual(response.data[0]["labelings_count"], 1)
