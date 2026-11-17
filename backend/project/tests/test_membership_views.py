from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from ..models import Project, ProjectMembership

class ProjectMembershipViewSetTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.owner_admin = User.objects.create_user(username="membership_owner_admin", password="pass123", email="owner@example.com")
        self.owner_admin.account_type = "admin"; self.owner_admin.save()

        self.contributor_admin = User.objects.create_user(
            username="membership_contrib_admin", password="pass123", email="contrib@example.com"
        )
        self.contributor_admin.account_type = "admin"; self.contributor_admin.save()

        self.viewer_admin = User.objects.create_user(
            username="membership_viewer_admin", password="pass123", email="viewer@example.com"
        )
        self.viewer_admin.account_type = "admin"; self.viewer_admin.save()

        self.owner_standard = User.objects.create_user(
            username="membership_owner_standard", password="pass123", email="owner-standard@example.com"
        )
        self.outsider_admin = User.objects.create_user(
            username="membership_outsider_admin", password="pass123", email="outsider@example.com"
        )
        self.outsider_admin.account_type = "admin"; self.outsider_admin.save()

        self.project_one = Project.objects.create(
            name="Project One",
            description="First",
            created_by=self.owner_admin,
        )
        self.project_two = Project.objects.create(
            name="Project Two",
            description="Second",
            created_by=self.owner_admin,
        )

        self.owner_membership_one = ProjectMembership.objects.create(
            project=self.project_one,
            user=self.owner_admin,
            role=ProjectMembership.RoleChoices.OWNER,
        )
        self.owner_membership_two = ProjectMembership.objects.create(
            project=self.project_two,
            user=self.owner_admin,
            role=ProjectMembership.RoleChoices.OWNER,
        )
        self.contributor_membership = ProjectMembership.objects.create(
            project=self.project_one,
            user=self.contributor_admin,
            role=ProjectMembership.RoleChoices.CONTRIBUTOR,
        )
        self.viewer_membership = ProjectMembership.objects.create(
            project=self.project_one,
            user=self.viewer_admin,
            role=ProjectMembership.RoleChoices.VIEWER,
        )
        self.owner_standard_membership = ProjectMembership.objects.create(
            project=self.project_one,
            user=self.owner_standard,
            role=ProjectMembership.RoleChoices.OWNER,
        )
        self.outsider_admin_membership = ProjectMembership.objects.create(
            project=self.project_two,
            user=self.outsider_admin,
            role=ProjectMembership.RoleChoices.CONTRIBUTOR,
        )

        self.new_user = User.objects.create_user(
            username="membership_new", password="pass123", email="new@example.com"
        )

        self.client = APIClient()
        self.memberships_url = reverse("project-memberships-list")

    def test_admin_owner_lists_every_membership_in_owned_projects(self):
        self.client.force_authenticate(self.owner_admin)
        # This test is about permission scoping, not pagination: request a page
        # large enough to fit everything in one response, otherwise the test
        # ends up depending on the cursor's default page_size.
        response = self.client.get(self.memberships_url, {"page_size": 100})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        project_ids = {item["project"] for item in results}
        self.assertEqual(project_ids, {self.project_one.id, self.project_two.id})
        expected_count = ProjectMembership.objects.filter(
            project__in=[self.project_one, self.project_two]
        ).count()
        self.assertEqual(len(results), expected_count)
        self.assertEqual(response.data["count"], expected_count)


    def test_admin_owner_can_create_membership(self):
        self.client.force_authenticate(self.owner_admin)
        payload = {
            "project": self.project_one.id,
            "user": self.new_user.id,
            "role": ProjectMembership.RoleChoices.VIEWER,
        }
        response = self.client.post(self.memberships_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            ProjectMembership.objects.filter(
                project=self.project_one, user=self.new_user
            ).exists()
        )

    def test_admin_contributor_cannot_create_membership(self):
        self.client.force_authenticate(self.contributor_admin)
        payload = {
            "project": self.project_one.id,
            "user": self.new_user.id,
            "role": ProjectMembership.RoleChoices.VIEWER,
        }
        response = self.client.post(self.memberships_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(
            ProjectMembership.objects.filter(
                project=self.project_one, user=self.new_user
            ).exists()
        )

    def test_admin_outsider_cannot_create_membership(self):
        self.client.force_authenticate(self.outsider_admin)
        payload = {
            "project": self.project_one.id,
            "user": self.new_user.id,
            "role": ProjectMembership.RoleChoices.VIEWER,
        }
        response = self.client.post(self.memberships_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(
            ProjectMembership.objects.filter(
                project=self.project_one, user=self.new_user
            ).exists()
        )

    def test_non_admin_owner_cannot_create_membership(self):
        self.client.force_authenticate(self.owner_standard)
        payload = {
            "project": self.project_one.id,
            "user": self.new_user.id,
            "role": ProjectMembership.RoleChoices.VIEWER,
        }
        response = self.client.post(self.memberships_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(
            ProjectMembership.objects.filter(
                project=self.project_one, user=self.new_user
            ).exists()
        )
