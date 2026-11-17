from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from ..models import Project, ProjectMembership

class ProjectViewSetTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.owner_admin = User.objects.create_user(username="proj_owner_admin", password="pass123", email="owner@example.com")
        self.owner_admin.account_type = "admin"; self.owner_admin.save()

        self.contributor_admin = User.objects.create_user(
            username="proj_contrib_admin", password="pass123", email="contrib@example.com"
        )
        self.contributor_admin.account_type = "admin"; self.contributor_admin.save()

        self.viewer_admin = User.objects.create_user(
            username="proj_viewer_admin", password="pass123", email="viewer@example.com"
        )
        self.viewer_admin.account_type = "admin"; self.viewer_admin.save()

        self.outsider_admin = User.objects.create_user(
            username="proj_outsider_admin", password="pass123", email="outsider@example.com"
        )
        self.outsider_admin.account_type = "admin"; self.outsider_admin.save()

        self.owner_standard = User.objects.create_user(
            username="proj_owner_standard", password="pass123", email="owner-standard@example.com"
        )
        self.contributor_standard = User.objects.create_user(
            username="proj_contrib_standard", password="pass123", email="contrib-standard@example.com"
        )

        self.project_owned = Project.objects.create(
            name="Owned",
            description="Owned desc",
            created_by=self.owner_admin,
        )
        ProjectMembership.objects.create(
            project=self.project_owned,
            user=self.owner_admin,
            role=ProjectMembership.RoleChoices.OWNER,
        )
        ProjectMembership.objects.create(
            project=self.project_owned,
            user=self.contributor_admin,
            role=ProjectMembership.RoleChoices.CONTRIBUTOR,
        )
        ProjectMembership.objects.create(
            project=self.project_owned,
            user=self.viewer_admin,
            role=ProjectMembership.RoleChoices.VIEWER,
        )
        ProjectMembership.objects.create(
            project=self.project_owned,
            user=self.owner_standard,
            role=ProjectMembership.RoleChoices.OWNER,
        )
        ProjectMembership.objects.create(
            project=self.project_owned,
            user=self.contributor_standard,
            role=ProjectMembership.RoleChoices.CONTRIBUTOR,
        )

        self.client = APIClient()
        self.projects_url = reverse("projects-list")
        self.project_detail_url = reverse("projects-detail", args=[self.project_owned.id])

    def test_admin_member_lists_projects(self):
        self.client.force_authenticate(self.owner_admin)
        response = self.client.get(self.projects_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.project_owned.id)

    def test_admin_non_member_gets_empty_list(self):
        self.client.force_authenticate(self.outsider_admin)
        response = self.client.get(self.projects_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_non_admin_member_cannot_list_projects(self):
        self.client.force_authenticate(self.owner_standard)
        response = self.client.get(self.projects_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_project_and_becomes_owner(self):
        self.client.force_authenticate(self.contributor_admin)
        payload = {"name": "API Created", "description": "via test"}
        response = self.client.post(self.projects_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        project = Project.objects.get(id=response.data["id"])
        self.assertEqual(project.created_by, self.contributor_admin)
        self.assertTrue(
            ProjectMembership.objects.filter(
                project=project, user=self.contributor_admin, role=ProjectMembership.RoleChoices.OWNER
            ).exists()
        )

    def test_non_admin_cannot_create_project(self):
        self.client.force_authenticate(self.owner_standard)
        payload = {"name": "Standard Attempt", "description": "should fail"}
        response = self.client.post(self.projects_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Project.objects.filter(name="Standard Attempt").exists())

    def test_admin_owner_can_update_project(self):
        self.client.force_authenticate(self.owner_admin)
        response = self.client.patch(self.project_detail_url, {"name": "Updated"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.project_owned.refresh_from_db()
        self.assertEqual(self.project_owned.name, "Updated")

    def test_admin_contributor_cannot_update_project(self):
        self.client.force_authenticate(self.contributor_admin)
        response = self.client.patch(self.project_detail_url, {"name": "Blocked"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.project_owned.refresh_from_db()
        self.assertNotEqual(self.project_owned.name, "Blocked")

    def test_admin_viewer_cannot_update_project(self):
        self.client.force_authenticate(self.viewer_admin)
        response = self.client.patch(self.project_detail_url, {"name": "Viewer Blocked"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.project_owned.refresh_from_db()
        self.assertNotEqual(self.project_owned.name, "Viewer Blocked")

    def test_admin_non_member_cannot_update_project(self):
        self.client.force_authenticate(self.outsider_admin)
        response = self.client.patch(self.project_detail_url, {"name": "Outsider Blocked"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.project_owned.refresh_from_db()
        self.assertNotEqual(self.project_owned.name, "Outsider Blocked")

    def test_non_admin_owner_cannot_update_project(self):
        self.client.force_authenticate(self.owner_standard)
        response = self.client.patch(self.project_detail_url, {"name": "Standard Blocked"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.project_owned.refresh_from_db()
        self.assertNotEqual(self.project_owned.name, "Standard Blocked")

    def test_admin_owner_can_delete_project(self):
        self.client.force_authenticate(self.owner_admin)
        response = self.client.delete(self.project_detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Project.objects.filter(id=self.project_owned.id).exists())

    def test_admin_non_member_cannot_delete_project(self):
        self.client.force_authenticate(self.outsider_admin)
        response = self.client.delete(self.project_detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Project.objects.filter(id=self.project_owned.id).exists())

    def test_admin_contributor_cannot_delete_project(self):
        self.client.force_authenticate(self.contributor_admin)
        response = self.client.delete(self.project_detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Project.objects.filter(id=self.project_owned.id).exists())

    def test_non_admin_owner_cannot_delete_project(self):
        self.client.force_authenticate(self.owner_standard)
        response = self.client.delete(self.project_detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Project.objects.filter(id=self.project_owned.id).exists())