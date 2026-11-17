from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from ..serializers import CustomUserSerializer, CustomUserCreateSerializer



class CustomUserSerializerTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="serializer_user",
            password="pass123",
            email="serializer@example.com",
            first_name="Serial",
            last_name="Izer",
        )

    def test_serialization_success(self):
        serializer = CustomUserSerializer(self.user)
        self.assertEqual(serializer.data["first_name"], "Serial")
        self.assertEqual(serializer.data["email"], "serializer@example.com")
        self.assertNotIn("password", serializer.data)

    def test_partial_update_success(self):
        payload = {"first_name": "Updated", "last_name": "Name"}
        serializer = CustomUserSerializer(self.user, data=payload, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_user = serializer.save()
        self.assertEqual(updated_user.first_name, "Updated")
        self.assertEqual(updated_user.last_name, "Name")


class CustomUserCreateSerializerTest(TestCase):
    def test_creates_user_with_hashed_password(self):
        data = {
            "username": "newuser",
            "email": "new@example.com",
            "first_name": "New",
            "last_name": "User",
            "password": "strongpass",
        }
        serializer = CustomUserCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()
        self.assertNotEqual(user.password, data["password"])
        self.assertTrue(user.check_password("strongpass"))

    def test_missing_required_field_fails(self):
        serializer = CustomUserCreateSerializer(data={"username": "missing@example.com"})
        self.assertFalse(serializer.is_valid())
        self.assertIn("email", serializer.errors)
        self.assertIn("password", serializer.errors)


class AdminUserViewSetTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(
            username="adminuser",
            password="adminpass",
            email="admin@example.com",
            first_name="Admin",
            last_name="User",
            is_staff=True,
            is_superuser=True,
        )
        self.other = User.objects.create_user(
            username="manageduser",
            password="managedpass",
            email="managed@example.com",
            first_name="Managed",
            last_name="User",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.base_url = "/users/"

    def test_list_users(self):
        response = self.client.get(self.base_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)
        usernames = {user["username"] for user in response.data}
        self.assertIn("adminuser", usernames)
        self.assertIn("manageduser", usernames)

    def test_create_user_via_viewset(self):
        payload = {
            "username": "newmanaged",
            "email": "newmanaged@example.com",
            "first_name": "New",
            "last_name": "Managed",
            "is_active": True,
            "is_staff": False,
            "password": "newpass123",
        }
        response = self.client.post(self.base_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        User = get_user_model()
        created = User.objects.get(username="newmanaged")
        self.assertTrue(created.check_password("newpass123"))
        self.assertEqual(response.data["username"], "newmanaged")

    def test_partial_update_user(self):
        payload = {"first_name": "Updated", "is_active": False}
        response = self.client.patch(
            f"{self.base_url}{self.other.id}/", payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.other.refresh_from_db()
        self.assertEqual(self.other.first_name, "Updated")
        self.assertFalse(self.other.is_active)

    def test_search_filter(self):
        User = get_user_model()
        User.objects.create_user(
            username="searchtarget",
            password="pass",
            email="target@example.com",
            first_name="Target",
            last_name="Person",
        )
        response = self.client.get(f"{self.base_url}?search=searchtarget")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["username"], "searchtarget")



