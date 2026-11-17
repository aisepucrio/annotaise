from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient


class RegisterAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/register/"

    def test_register_user_success(self):
        payload = {
            "email": "api@example.com",
            "first_name": "Api",
            "last_name": "User",
            "password": "apipass123",
        }
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)
        self.assertEqual(response.data["email"], payload["email"])
        self.assertNotIn("password", response.data)

        User = get_user_model()
        self.assertTrue(User.objects.filter(email="api@example.com").exists())

    def test_register_user_missing_fields(self):
        response = self.client.post(self.url, {"username": ""}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)


class CurrentUserAPITest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="currentuser",
            password="currentpass",
            email="current@example.com",
            first_name="Current",
            last_name="User",
        )
        self.client = APIClient()
        self.url = "/users/current/"

    def test_requires_authentication(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieves_current_user(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "current@example.com")

    def test_updates_current_user(self):
        self.client.force_authenticate(self.user)
        payload = {"first_name": "Updated"}
        response = self.client.patch(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Updated")

    def test_delete_current_user(self):
        self.client.force_authenticate(self.user)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        User = get_user_model()
        self.assertFalse(User.objects.filter(username="currentuser").exists())