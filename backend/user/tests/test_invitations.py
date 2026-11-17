from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from project.models import Project, ProjectMembership
from labeling.models import Labeling, LabelingMembership
from ..models import Invitation

class InvitationPendingUserFlowTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(
            username="owneradmin",
            email="owneradmin@example.com",
            password="pass123",
            account_type="admin",
        )
        self.project = Project.objects.create(
            name="Projeto Convite",
            description="Projeto para testar convite com vínculo",
            created_by=self.admin,
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=self.admin,
            role=ProjectMembership.RoleChoices.OWNER,
        )
        self.labeling_one = Labeling.objects.create(
            title="Rotulacao A",
            project=self.project,
            created_by=self.admin,
            start_date=timezone.now().date(),
            final_date=timezone.now().date(),
        )
        self.labeling_two = Labeling.objects.create(
            title="Rotulacao B",
            project=self.project,
            created_by=self.admin,
            start_date=timezone.now().date(),
            final_date=timezone.now().date(),
        )

        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_create_invitation_creates_pending_user_and_labeling_memberships_from_project(self):
        payload = {
            "email": "pending.user@example.com",
            "role": "standard",
            "project_ids": [self.project.id],
        }
        response = self.client.post("/invitations/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("link", response.data)
        self.assertIn("invitation", response.data)

        User = get_user_model()
        invited_user = User.objects.get(email="pending.user@example.com")
        self.assertEqual(invited_user.onboarding_status, "pending")
        self.assertFalse(invited_user.is_active)
        self.assertEqual(invited_user.account_type, "standard")

        invitation = Invitation.objects.get(token=response.data["invitation"]["token"])
        self.assertEqual(invitation.user_id, invited_user.id)

        memberships = LabelingMembership.objects.filter(
            user=invited_user,
        ).order_by("labeling_id")
        self.assertEqual(
            list(memberships.values_list("labeling_id", flat=True)),
            [self.labeling_one.id, self.labeling_two.id],
        )
        self.assertTrue(
            all(
                membership.role == LabelingMembership.Role.ANNOTATOR
                for membership in memberships
            )
        )

    def test_create_invitation_with_specific_labelings_assigns_only_selected_labelings(self):
        payload = {
            "email": "pending.specific@example.com",
            "role": "standard",
            "labeling_ids": [self.labeling_two.id],
            "email_language": "en",
        }
        response = self.client.post("/invitations/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["link"].endswith("?lang=en"))

        User = get_user_model()
        invited_user = User.objects.get(email="pending.specific@example.com")
        memberships = LabelingMembership.objects.filter(user=invited_user)
        self.assertEqual(memberships.count(), 1)
        self.assertEqual(memberships.first().labeling_id, self.labeling_two.id)

    def test_create_invitation_forbidden_when_labeling_is_outside_owner_scope(self):
        User = get_user_model()
        outsider_admin = User.objects.create_user(
            username="other-owner",
            email="other-owner@example.com",
            password="pass123",
            account_type="admin",
        )
        outsider_project = Project.objects.create(
            name="Projeto Externo",
            description="",
            created_by=outsider_admin,
        )
        ProjectMembership.objects.create(
            project=outsider_project,
            user=outsider_admin,
            role=ProjectMembership.RoleChoices.OWNER,
        )
        outsider_labeling = Labeling.objects.create(
            title="Rotulacao Externa",
            project=outsider_project,
            created_by=outsider_admin,
            start_date=timezone.now().date(),
            final_date=timezone.now().date(),
        )

        payload = {
            "email": "pending.forbidden@example.com",
            "role": "standard",
            "labeling_ids": [outsider_labeling.id],
        }
        response = self.client.post("/invitations/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data.get("code"), "LABELING_ASSIGNMENT_FORBIDDEN")

    def test_assignment_options_returns_only_owner_projects_with_nested_labelings(self):
        User = get_user_model()
        contrib_admin = User.objects.create_user(
            username="contrib-admin",
            email="contrib-admin@example.com",
            password="pass123",
            account_type="admin",
        )
        contrib_project = Project.objects.create(
            name="Projeto Contrib",
            description="",
            created_by=contrib_admin,
        )
        ProjectMembership.objects.create(
            project=contrib_project,
            user=contrib_admin,
            role=ProjectMembership.RoleChoices.OWNER,
        )
        ProjectMembership.objects.create(
            project=contrib_project,
            user=self.admin,
            role=ProjectMembership.RoleChoices.CONTRIBUTOR,
        )
        Labeling.objects.create(
            title="Rotulacao Contrib",
            project=contrib_project,
            created_by=contrib_admin,
            start_date=timezone.now().date(),
            final_date=timezone.now().date(),
        )

        response = self.client.get("/invitations/assignment-options/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        projects = response.data.get("projects", [])
        self.assertEqual(len(projects), 1)
        self.assertEqual(projects[0]["id"], self.project.id)
        self.assertEqual(
            {item["id"] for item in projects[0]["labelings"]},
            {self.labeling_one.id, self.labeling_two.id},
        )

    def test_accept_invitation_activates_existing_pending_user(self):
        create_response = self.client.post(
            "/invitations/",
            {"email": "pending.accept@example.com", "role": "standard"},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        invitation_token = create_response.data["invitation"]["token"]
        User = get_user_model()
        invited_user = User.objects.get(email="pending.accept@example.com")
        pending_user_id = invited_user.id

        accept_payload = {
            "first_name": "Pending",
            "last_name": "Accepted",
            "password": "accepted-pass-123",
        }
        accept_response = self.client.post(
            f"/invitations/accept/{invitation_token}/",
            accept_payload,
            format="json",
        )
        self.assertEqual(accept_response.status_code, status.HTTP_201_CREATED)

        invited_user.refresh_from_db()
        self.assertEqual(invited_user.id, pending_user_id)
        self.assertEqual(invited_user.onboarding_status, "active")
        self.assertTrue(invited_user.is_active)
        self.assertEqual(invited_user.first_name, "Pending")
        self.assertEqual(invited_user.last_name, "Accepted")
        self.assertTrue(invited_user.check_password("accepted-pass-123"))