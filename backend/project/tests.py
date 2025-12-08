from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.utils import timezone

from .models import Project, ProjectMembership
from .serializers import ProjectSerializer, ProjectMembershipSerializer
from labeling.models import Labeling, LabelingElement, LabelingSection

class BaseSerializerTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="testuser", password="12345")
        self.project = Project.objects.create(
            name="Test Project",
            description="Test Description",
            created_by=self.user
        )
        self.labeling = Labeling.objects.create(
            project=self.project,
            title="Test Labeling",
            created_by=self.user,
            start_date=timezone.now().date(),
            final_date=timezone.now().date(),
        )
        self.section = LabelingSection.objects.create(
            labeling=self.labeling,
            title="Test Section",
            order=1
        )
        self.element = LabelingElement.objects.create(
            labeling_section=self.section,
            text="Test Question",
            question_type="text",
            order=1
        )

class ProjectSerializerTest(BaseSerializerTest):
    def test_serialization_success(self):
        serializer = ProjectSerializer(self.project)
        self.assertEqual(serializer.data['name'], "Test Project")
        self.assertEqual(serializer.data['description'], "Test Description")
        self.assertEqual(serializer.data['created_by'], self.user.id)

    def test_deserialization_success(self):
        payload = {
            "id": 999,  # tentativa de sobrescrever id (read-only)
            "name": "New Project",
            "description": "New Description",
        }
        serializer = ProjectSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        obj = serializer.save(created_by=self.user)
        self.assertNotEqual(obj.id, 999)
        self.assertEqual(obj.created_by_id, self.user.id)

    def test_deserialization_failure(self):
        bad_payload = {
            # name is required
            "description": "Test"
        }
        serializer = ProjectSerializer(data=bad_payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)


class ProjectMembershipSerializerTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.owner = User.objects.create_user(username="owner", password="pass123", email="owner@example.com")
        self.member = User.objects.create_user(username="member", password="pass123", email="member@example.com")
        self.project = Project.objects.create(
            name="Membership Project",
            description="Test Desc",
            created_by=self.owner,
        )
        self.membership = ProjectMembership.objects.create(
            project=self.project,
            user=self.owner,
            role=ProjectMembership.RoleChoices.OWNER,
        )

    def test_serialization_returns_expected_fields(self):
        serializer = ProjectMembershipSerializer(self.membership)
        self.assertEqual(serializer.data["project"], self.project.id)
        self.assertEqual(serializer.data["user"], self.owner.id)
        self.assertEqual(serializer.data["role"], ProjectMembership.RoleChoices.OWNER)
        self.assertIn("joined_at", serializer.data)

    def test_deserialization_creates_membership(self):
        payload = {
            "project": self.project.id,
            "user": self.member.id,
            "role": ProjectMembership.RoleChoices.CONTRIBUTOR,
            "joined_at": "2000-01-01T00:00:00Z",  # ignorado (read-only)
        }
        serializer = ProjectMembershipSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        membership = serializer.save()
        self.assertEqual(membership.user, self.member)
        self.assertEqual(membership.role, ProjectMembership.RoleChoices.CONTRIBUTOR)
        self.assertNotEqual(
            membership.joined_at.isoformat(), "2000-01-01T00:00:00+00:00"
        )


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
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
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
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
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
        response = self.client.get(self.memberships_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        project_ids = {item["project"] for item in response.data}
        self.assertEqual(project_ids, {self.project_one.id, self.project_two.id})
        expected_count = ProjectMembership.objects.filter(
            project__in=[self.project_one, self.project_two]
        ).count()
        self.assertEqual(len(response.data), expected_count)

    def test_admin_non_owner_cannot_list_memberships(self):
        self.client.force_authenticate(self.outsider_admin)
        response = self.client.get(self.memberships_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_contributor_cannot_list_memberships(self):
        self.client.force_authenticate(self.contributor_admin)
        response = self.client.get(self.memberships_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_admin_owner_cannot_list_memberships(self):
        self.client.force_authenticate(self.owner_standard)
        response = self.client.get(self.memberships_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

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
