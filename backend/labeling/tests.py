from django.test import TestCase
from django.urls import reverse
from rest_framework import serializers as drf_serializers, status
from rest_framework.test import APIClient
from .serializers import LabelingSerializer, LabelingSectionSerializer, LabelingElementSerializer, MultipleChoiceItemSerializer, QuestionRangeSerializer, LabelingMembershipSerializer
from .models import Labeling, LabelingSection, LabelingElement, MultipleChoiceItem, QuestionRange, LabelingMembership
from project.models import Project, ProjectMembership
from item.models import Item
from answer.models import Answer
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

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

class LabelingSectionSerializerTest(BaseSerializerTest):
    def test_serialization_success(self):
        serializer = LabelingSectionSerializer(self.section)
        self.assertEqual(serializer.data['title'], "Test Section")
        self.assertEqual(serializer.data['order'], 1)
        self.assertEqual(len(serializer.data["elements"]), 1)
        self.assertEqual(serializer.data["elements"][0]["text"], "Test Question")

class LabelingElementSerializerTest(BaseSerializerTest):
    def setUp(self):
        super().setUp()
        self.choice = MultipleChoiceItem.objects.create(
            labeling_element=self.element,
            text="Choice A",
            value=True,
            order=1
        )
        self.range = QuestionRange.objects.create(
            labeling_element=self.element,
            start=0,
            end=10,
        )

    def test_serialization_success(self):
        serializer = LabelingElementSerializer(self.element)
        self.assertEqual(serializer.data['text'], "Test Question")
        self.assertEqual(serializer.data['question_type'], "text")
        self.assertEqual(serializer.data['multiple_choice_items'][0]['text'], "Choice A")
        self.assertEqual(serializer.data['question_range']['start'], 0)

class MultipleChoiceItemSerializerTest(BaseSerializerTest):
    def setUp(self):
        super().setUp()
        self.choice = MultipleChoiceItem.objects.create(
            labeling_element=self.element,
            text="Test Choice",
            value=True,
            order=1
        )

    def test_serialization_success(self):
        serializer = MultipleChoiceItemSerializer(self.choice)
        self.assertEqual(serializer.data['text'], "Test Choice")
        self.assertEqual(serializer.data['value'], True)
        self.assertEqual(serializer.data['order'], 1)

class QuestionRangeSerializerTest(BaseSerializerTest):
    def setUp(self):
        super().setUp()
        # second element, to confirm the range belongs to the expected element
        self.element2 = LabelingElement.objects.create(
            labeling_section=self.section,
            text="Another Question",
            question_type="number",
            order=2
        )
        self.range = QuestionRange.objects.create(
            labeling_element=self.element,
            start=0,
            end=10,
        )
 
    def test_serialization_success(self):
        serializer = QuestionRangeSerializer(self.range)
        self.assertEqual(serializer.data['start'], 0)
        self.assertEqual(serializer.data['end'], 10)

class LabelingMembershipSerializerTest(BaseSerializerTest):
    def setUp(self):
        super().setUp()
        self.membership = LabelingMembership.objects.create(
            user=self.user,
            labeling=self.labeling,
            role="annotator",
            items_done=0
        )

    def test_serialization_success(self):
        serializer = LabelingMembershipSerializer(self.membership)
        self.assertEqual(serializer.data['user'], self.user.id)
        self.assertEqual(serializer.data['labeling'], self.labeling.id)
        self.assertEqual(serializer.data['role'], "annotator")
        self.assertEqual(serializer.data['items_done'], 0)

    def test_deserialization_success(self):
        User = get_user_model()
        other_user = User.objects.create_user(username="otheruser",email="testest@g.com", password="pwd123")
        payload = {
            "id": 999,
            "user": other_user.id,  # a distinct user, so we don't violate the relation's uniqueness
            "labeling": self.labeling.id,
            "role": "owner",
            "items_done": 5
        }
        serializer = LabelingMembershipSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        obj = serializer.save()
        self.assertNotEqual(obj.id, 999)

    def test_deserialization_failure(self):
        bad_payload = {
            # user and labeling are required
            "role": "invalid_role"  # invalid choice
        }
        serializer = LabelingMembershipSerializer(data=bad_payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("user", serializer.errors)
        self.assertIn("labeling", serializer.errors)
        self.assertIn("role", serializer.errors)

    def test_update_prevents_labeling_change(self):
        other_labeling = Labeling.objects.create(
            project=self.project,
            title="Other Labeling",
            created_by=self.user,
            start_date=timezone.now().date(),
            final_date=timezone.now().date(),
        )
        serializer = LabelingMembershipSerializer(
            instance=self.membership,
            data={"labeling": other_labeling.id},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        with self.assertRaises(drf_serializers.ValidationError):
            serializer.save()


class LabelingViewSetTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.owner_admin = User.objects.create_user(
            username="label_owner_admin", password="pass123", email="owner@example.com"
        )
        self.owner_admin.account_type = "admin"; self.owner_admin.save()

        self.contributor_admin = User.objects.create_user(
            username="label_contrib_admin", password="pass123", email="contrib-admin@example.com"
        )
        self.contributor_admin.account_type = "admin"; self.contributor_admin.save()

        self.viewer_admin = User.objects.create_user(
            username="label_viewer_admin", password="pass123", email="viewer-admin@example.com"
        )
        self.viewer_admin.account_type = "admin"; self.viewer_admin.save()

        self.outsider_admin = User.objects.create_user(
            username="label_outsider_admin", password="pass123", email="outsider-admin@example.com"
        )
        self.outsider_admin.account_type = "admin"; self.outsider_admin.save()

        self.owner_standard = User.objects.create_user(
            username="label_owner_standard", password="pass123", email="owner-standard@example.com"
        )
        self.contributor_standard = User.objects.create_user(
            username="label_contrib_standard", password="pass123", email="contrib-standard@example.com"
        )

        self.project = Project.objects.create(
            name="Main Project",
            description="Primary",
            created_by=self.owner_admin,
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=self.owner_admin,
            role=ProjectMembership.RoleChoices.OWNER,
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=self.contributor_admin,
            role=ProjectMembership.RoleChoices.CONTRIBUTOR,
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=self.viewer_admin,
            role=ProjectMembership.RoleChoices.VIEWER,
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=self.owner_standard,
            role=ProjectMembership.RoleChoices.OWNER,
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=self.contributor_standard,
            role=ProjectMembership.RoleChoices.CONTRIBUTOR,
        )

        self.final_date = timezone.now().date()
        self.labeling = Labeling.objects.create(
            project=self.project,
            title="Owned Labeling",
            created_by=self.owner_admin,
            start_date=self.final_date,
            final_date=self.final_date,
        )
        LabelingMembership.objects.create(
            labeling=self.labeling,
            user=self.owner_admin,
            role=LabelingMembership.Role.OWNER,
        )
        LabelingMembership.objects.create(
            labeling=self.labeling,
            user=self.contributor_admin,
            role=LabelingMembership.Role.ADMIN,
        )
        LabelingMembership.objects.create(
            labeling=self.labeling,
            user=self.viewer_admin,
            role=LabelingMembership.Role.VIEWER,
        )
        LabelingMembership.objects.create(
            labeling=self.labeling,
            user=self.contributor_standard,
            role=LabelingMembership.Role.ANNOTATOR,
        )

        self.client = APIClient()
        self.list_url = reverse("labelings-list")
        self.detail_url = reverse("labelings-detail", args=[self.labeling.id])

    def test_admin_owner_can_create_labeling(self):
        self.client.force_authenticate(self.owner_admin)
        payload = {"title": "API Labeling", "project": self.project.id, "final_date": self.final_date}
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["project"], self.project.id)

    def test_admin_contributor_can_create_labeling(self):
        '''se futuramente o colaborador nao puder mais editar tem que mudar isso aqui'''
        self.client.force_authenticate(self.contributor_admin)
        payload = {"title": "Contributor Labeling", "project": self.project.id, "final_date": self.final_date}
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_viewer_cannot_create_labeling(self):
        self.client.force_authenticate(self.viewer_admin)
        payload = {"title": "Viewer Attempt", "project": self.project.id, "final_date": self.final_date}
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Labeling.objects.filter(title="Viewer Attempt").exists())

    def test_admin_without_membership_cannot_create_labeling(self):
        self.client.force_authenticate(self.outsider_admin)
        payload = {"title": "Outsider Attempt", "project": self.project.id, "final_date": self.final_date}
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Labeling.objects.filter(title="Outsider Attempt").exists())

    def test_non_admin_owner_cannot_create_labeling(self):
        self.client.force_authenticate(self.owner_standard)
        payload = {"title": "Standard Owner Attempt", "project": self.project.id, "final_date": self.final_date}
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Labeling.objects.filter(title="Standard Owner Attempt").exists())

    def test_admin_owner_can_update_labeling(self):
        self.client.force_authenticate(self.owner_admin)
        response = self.client.patch(self.detail_url, {"title": "Updated Title"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.labeling.refresh_from_db()
        self.assertEqual(self.labeling.title, "Updated Title")

    def test_admin_contributor_can_update_labeling(self):
        self.client.force_authenticate(self.contributor_admin)
        response = self.client.patch(self.detail_url, {"title": "Contributor Updated"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.labeling.refresh_from_db()
        self.assertEqual(self.labeling.title, "Contributor Updated")

    def test_project_contributor_without_labeling_role_cannot_update_labeling(self):
        """Edit permission comes from the labeling_membership, not the project."""
        LabelingMembership.objects.filter(
            labeling=self.labeling, user=self.contributor_admin
        ).update(role=LabelingMembership.Role.ANNOTATOR)

        self.client.force_authenticate(self.contributor_admin)
        response = self.client.patch(self.detail_url, {"title": "Should Fail"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.labeling.refresh_from_db()
        self.assertEqual(self.labeling.title, "Owned Labeling")

    def test_admin_viewer_cannot_update_labeling(self):
        self.client.force_authenticate(self.viewer_admin)
        response = self.client.patch(self.detail_url, {"title": "Viewer Updated"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.labeling.refresh_from_db()
        self.assertEqual(self.labeling.title, "Owned Labeling")

    def test_non_admin_contributor_cannot_update_labeling(self):
        self.client.force_authenticate(self.contributor_standard)
        response = self.client.patch(self.detail_url, {"title": "Standard Contributor Update"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.labeling.refresh_from_db()
        self.assertEqual(self.labeling.title, "Owned Labeling")

    def test_admin_owner_can_delete_labeling(self):
        self.client.force_authenticate(self.owner_admin)
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Labeling.objects.filter(id=self.labeling.id).exists())

    def test_labeling_admin_cannot_delete_labeling(self):
        """Deletion is owner-only; an admin can only edit."""
        self.client.force_authenticate(self.contributor_admin)
        response = self.client.delete(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Labeling.objects.filter(id=self.labeling.id).exists())

    def test_admin_without_membership_cannot_delete_labeling(self):
        self.client.force_authenticate(self.outsider_admin)
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)# 404, not 403: it's excluded from the queryset entirely
        self.assertTrue(Labeling.objects.filter(id=self.labeling.id).exists())


class LabelingMembershipViewSetTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.owner = User.objects.create_user(username="lm_owner", password="pass123", email="owner@example.com")
        self.annotator = User.objects.create_user(
            username="lm_annotator", password="pass123", email="annotator@example.com"
        )
        self.project_member = User.objects.create_user(
            username="lm_project_member", password="pass123", email="project-member@example.com"
        )
        self.outsider = User.objects.create_user(
            username="lm_outsider", password="pass123", email="outside@example.com"
        )
        self.staff = User.objects.create_user(
            username="lm_staff", password="pass123", email="staff@example.com", is_staff=True, account_type="admin"
        )
        self.owner.account_type = "admin"; self.owner.save()

        self.project = Project.objects.create(
            name="LM Project",
            description="LM Desc",
            created_by=self.owner,
        )

        ProjectMembership.objects.create(
            project=self.project,
            user=self.owner,
            role=ProjectMembership.RoleChoices.OWNER,
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=self.annotator,
            role=ProjectMembership.RoleChoices.CONTRIBUTOR,
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=self.project_member,
            role=ProjectMembership.RoleChoices.VIEWER,
        )

        self.labeling_one = Labeling.objects.create(
            project=self.project,
            title="Labeling One",
            created_by=self.owner,
            start_date=timezone.now().date(),
            final_date=timezone.now().date(),
        )
        self.labeling_two = Labeling.objects.create(
            project=self.project,
            title="Labeling Two",
            created_by=self.owner,
            start_date=timezone.now().date(),
            final_date=timezone.now().date(),
        )

        LabelingMembership.objects.create(
            labeling=self.labeling_one,
            user=self.owner,
            role="owner",
        )
        LabelingMembership.objects.create(
            labeling=self.labeling_one,
            user=self.annotator,
            role="annotator",
        )
        LabelingMembership.objects.create(
            labeling=self.labeling_two,
            user=self.owner,
            role="owner",
        )
        LabelingMembership.objects.create(
            labeling=self.labeling_two,
            user=self.project_member,
            role="viewer",
        )

        self.client = APIClient()
        self.memberships_url = reverse("labeling-memberships-list")

    def test_owner_lists_all_memberships_for_owned_labelings(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(self.memberships_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_count = LabelingMembership.objects.filter(
            labeling__in=[self.labeling_one, self.labeling_two]
        ).count()
        self.assertEqual(len(response.data), expected_count)

    def test_non_owner_gets_empty_queryset(self):
        self.client.force_authenticate(self.annotator)
        response = self.client.get(self.memberships_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_sees_all_memberships(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(self.memberships_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), LabelingMembership.objects.count())

    def test_owner_can_create_membership_for_project_user(self):
        new_user = User.objects.create_user(
            username="lm_new_user", password="pass123", email="new@example.com"
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=new_user,
            role=ProjectMembership.RoleChoices.VIEWER,
        )

        self.client.force_authenticate(self.owner)
        payload = {
            "labeling": self.labeling_one.id,
            "user": new_user.id,
            "role": "annotator",
        }
        response = self.client.post(self.memberships_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            LabelingMembership.objects.filter(
                labeling=self.labeling_one, user=new_user
            ).exists()
        )


    def test_non_owner_cannot_create_membership(self):
        self.client.force_authenticate(self.annotator)
        payload = {
            "labeling": self.labeling_one.id,
            "user": self.project_member.id,
            "role": "viewer",
        }
        response = self.client.post(self.memberships_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(
            LabelingMembership.objects.filter(
                labeling=self.labeling_one, user=self.project_member
            ).exists()
        )

    # --- last-owner protection ---

    def _detail_url(self, membership):
        return reverse("labeling-memberships-detail", args=[membership.id])

    def test_last_owner_cannot_be_demoted(self):
        membership = LabelingMembership.objects.get(labeling=self.labeling_one, user=self.owner)
        self.client.force_authenticate(self.owner)
        response = self.client.patch(
            self._detail_url(membership), {"role": "annotator"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        membership.refresh_from_db()
        self.assertEqual(membership.role, "owner")

    def test_last_owner_cannot_be_removed(self):
        membership = LabelingMembership.objects.get(labeling=self.labeling_one, user=self.owner)
        self.client.force_authenticate(self.owner)
        response = self.client.delete(self._detail_url(membership))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(LabelingMembership.objects.filter(pk=membership.pk).exists())

    def test_owner_can_be_demoted_when_another_owner_exists(self):
        LabelingMembership.objects.filter(
            labeling=self.labeling_one, user=self.annotator
        ).update(role="owner")
        membership = LabelingMembership.objects.get(labeling=self.labeling_one, user=self.owner)

        self.client.force_authenticate(self.owner)
        response = self.client.patch(
            self._detail_url(membership), {"role": "admin"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        membership.refresh_from_db()
        self.assertEqual(membership.role, "admin")

    def test_non_owner_membership_is_removable(self):
        membership = LabelingMembership.objects.get(labeling=self.labeling_one, user=self.annotator)
        self.client.force_authenticate(self.owner)
        response = self.client.delete(self._detail_url(membership))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(LabelingMembership.objects.filter(pk=membership.pk).exists())

    def test_owner_of_one_labeling_does_not_block_another(self):
        """is_last_owner counts owners of the same labeling, not system-wide."""
        membership = LabelingMembership.objects.get(labeling=self.labeling_two, user=self.project_member)
        self.assertFalse(membership.is_last_owner())


class AnnotateRoleGateTest(TestCase):
    """A 'viewer' joins the labeling as a reader: doesn't answer, doesn't get items."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="ar_owner", password="pass123", email="ar-owner@example.com"
        )
        self.viewer = User.objects.create_user(
            username="ar_viewer", password="pass123", email="ar-viewer@example.com"
        )
        self.annotator = User.objects.create_user(
            username="ar_annotator", password="pass123", email="ar-annotator@example.com"
        )
        self.project = Project.objects.create(
            name="AR Project", description="d", created_by=self.owner
        )
        self.labeling = Labeling.objects.create(
            project=self.project,
            title="AR Labeling",
            created_by=self.owner,
            start_date=timezone.now().date(),
            final_date=timezone.now().date(),
        )
        for user, role in [
            (self.owner, "owner"),
            (self.viewer, "viewer"),
            (self.annotator, "annotator"),
        ]:
            LabelingMembership.objects.create(labeling=self.labeling, user=user, role=role)

    def test_viewer_cannot_annotate(self):
        from .permissions import can_annotate_labeling

        self.assertFalse(can_annotate_labeling(self.viewer, self.labeling.id))

    def test_owner_admin_and_annotator_can_annotate(self):
        from .permissions import can_annotate_labeling

        self.assertTrue(can_annotate_labeling(self.owner, self.labeling.id))
        self.assertTrue(can_annotate_labeling(self.annotator, self.labeling.id))

    def test_non_member_cannot_annotate(self):
        from .permissions import can_annotate_labeling

        outsider = User.objects.create_user(
            username="ar_outsider", password="pass123", email="ar-out@example.com"
        )
        self.assertFalse(can_annotate_labeling(outsider, self.labeling.id))

    def _dashboard_titles(self, user):
        client = APIClient()
        client.force_authenticate(user)
        response = client.get(reverse("labelings-dashboard"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return [row["labeling_name"] for row in response.data["results"]]

    def test_viewer_labeling_absent_from_annotator_dashboard(self):
        # Pending item: without it the labeling wouldn't appear on anyone's
        # dashboard, and the test would pass without proving anything about the role.
        Item.objects.create(labeling=self.labeling, payload={"text": "x"}, row_index=0)

        self.assertIn("AR Labeling", self._dashboard_titles(self.annotator))
        self.assertNotIn("AR Labeling", self._dashboard_titles(self.viewer))


class LabelingStructureViewTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.owner_admin = User.objects.create_user(
            username="structure_owner_admin", password="pass123", email="owner@example.com"
        )
        self.owner_admin.account_type = "admin"; self.owner_admin.save()
        self.contributor_admin = User.objects.create_user(
            username="structure_contrib_admin", password="pass123", email="contrib@example.com"
        )
        self.contributor_admin.account_type = "admin"; self.contributor_admin.save()
        self.viewer_admin = User.objects.create_user(
            username="structure_viewer_admin", password="pass123", email="viewer@example.com"
        )
        self.viewer_admin.account_type = "admin"; self.viewer_admin.save()
        self.owner_standard = User.objects.create_user(
            username="structure_owner_standard", password="pass123", email="owner-standard@example.com"
        )
        self.outsider_admin = User.objects.create_user(
            username="structure_outsider_admin", password="pass123", email="outsider@example.com"
        )
        self.outsider_admin.account_type = "admin"; self.outsider_admin.save()

        self.project = Project.objects.create(
            name="Structure Project",
            description="For structure tests",
            created_by=self.owner_admin,
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=self.owner_admin,
            role=ProjectMembership.RoleChoices.OWNER,
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=self.contributor_admin,
            role=ProjectMembership.RoleChoices.CONTRIBUTOR,
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=self.viewer_admin,
            role=ProjectMembership.RoleChoices.VIEWER,
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=self.owner_standard,
            role=ProjectMembership.RoleChoices.OWNER,
        )
        self.labeling = Labeling.objects.create(
            project=self.project,
            title="Structured Labeling",
            created_by=self.owner_admin,
            start_date=timezone.now().date(),
            final_date=timezone.now().date(),
        )
        LabelingMembership.objects.create(
            labeling=self.labeling,
            user=self.owner_admin,
            role=LabelingMembership.Role.OWNER,
        )
        LabelingMembership.objects.create(
            labeling=self.labeling,
            user=self.contributor_admin,
            role=LabelingMembership.Role.ADMIN,
        )
        LabelingMembership.objects.create(
            labeling=self.labeling,
            user=self.viewer_admin,
            role=LabelingMembership.Role.VIEWER,
        )

        self.client = APIClient()
        self.structure_url = reverse("labeling-structure", args=[self.labeling.id])

        self.valid_payload = {
            "sections": [
                {
                    "title": "Informações gerais",
                    "order": 1,
                    "elements": [
                        {
                            "order": 1,
                            "text": "Qual é o seu nome?",
                            "required": True,
                            "question_type": "text",
                            "column_name": "nome",
                            "multiple_choice_items": [],
                            "question_range": None,
                        },
                        {
                            "order": 2,
                            "text": "Qual sua idade?",
                            "required": True,
                            "question_type": "number",
                            "column_name": "idade",
                            "multiple_choice_items": [],
                            "question_range": {
                                "start": 0,
                                "end": 120,
                            },
                        },
                    ],
                },
                {
                    "title": "Preferências",
                    "order": 2,
                    "elements": [
                        {
                            "order": 1,
                            "text": "Qual seu esporte favorito?",
                            "required": False,
                            "question_type": "multiple_choice",
                            "column_name": "esporte",
                            "multiple_choice_items": [
                                {
                                    "text": "Futebol",
                                    "value": True,
                                    "order": 1,
                                },
                                {
                                    "text": "Basquete",
                                    "value": False,
                                    "order": 2,
                                },
                                {
                                    "text": "Natação",
                                    "value": False,
                                    "order": 3,
                                },
                            ],
                            "question_range": None,
                        },
                        {
                            "order": 2,
                            "text": "Quantas horas dorme por noite?",
                            "required": False,
                            "question_type": "number",
                            "column_name": "sono",
                            "multiple_choice_items": [],
                            "question_range": {
                                "start": 0,
                                "end": 24,
                            },
                        },
                    ],
                },
            ]
        }

    def _persist_structure(self, payload):
        for section_data in payload["sections"]:
            section = LabelingSection.objects.create(
                labeling=self.labeling,
                title=section_data["title"],
                order=section_data["order"],
            )
            for element_data in section_data.get("elements", []):
                element = LabelingElement.objects.create(
                    labeling_section=section,
                    order=element_data["order"],
                    text=element_data["text"],
                    required=element_data.get("required", False),
                    question_type=element_data["question_type"],
                    column_name=element_data.get("column_name", ""),
                )
                for item_data in element_data.get("multiple_choice_items", []):
                    MultipleChoiceItem.objects.create(
                        labeling_element=element,
                        text=item_data["text"],
                        value=item_data["value"],
                        order=item_data["order"],
                    )

                question_range_data = element_data.get("question_range")
                if question_range_data is not None:
                    QuestionRange.objects.create(
                        labeling_element=element,
                        start=question_range_data["start"],
                        end=question_range_data["end"],
                        start_label=question_range_data.get("start_label", ""),
                        end_label=question_range_data.get("end_label", ""),
                    )

    def _simplify_structure(self, sections):
        simplified = []
        for section in sections:
            elements = []
            for element in section.get("elements", []):
                question_range = element.get("question_range")
                elements.append(
                    {
                        "order": element["order"],
                        "text": element["text"],
                        "required": element.get("required", False),
                        "question_type": element["question_type"],
                        "column_name": element.get("column_name", ""),
                        "multiple_choice_items": [
                            {
                                "text": item["text"],
                                "value": item["value"],
                                "order": item["order"],
                            }
                            for item in element.get("multiple_choice_items", [])
                        ],
                        "question_range": None
                        if question_range is None
                        else {
                            "start": question_range["start"],
                            "end": question_range["end"],
                            "start_label": question_range.get("start_label", ""),
                            "end_label": question_range.get("end_label", ""),
                        },
                    }
                )

            simplified.append(
                {
                    "title": section["title"],
                    "order": section["order"],
                    "elements": elements,
                }
            )
        return simplified

    def test_get_returns_labeling_structure(self):
        self._persist_structure(self.valid_payload)

        self.client.force_authenticate(self.owner_admin)
        response = self.client.get(self.structure_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_structure = self._simplify_structure(self.valid_payload["sections"])
        self.assertEqual(self._simplify_structure(response.data), expected_structure)

    def test_put_replaces_structure_with_payload(self):
        self.client.force_authenticate(self.contributor_admin)
        old_section = LabelingSection.objects.create(
            labeling=self.labeling, title="Old Section", order=10
        )
        LabelingElement.objects.create(
            labeling_section=old_section,
            order=1,
            text="Legacy question",
            required=False,
            question_type=LabelingElement.QuestionType.TEXT,
            column_name="legacy",
        )

        response = self.client.put(
            self.structure_url, self.valid_payload, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            LabelingSection.objects.filter(id=old_section.id).exists(),
            "Existing sections should be replaced before saving the new structure.",
        )
        self.assertEqual(
            LabelingSection.objects.filter(labeling=self.labeling).count(), 2
        )
        self.assertEqual(
            LabelingElement.objects.filter(labeling_section__labeling=self.labeling).count(),
            4,
        )
        self.assertEqual(
            MultipleChoiceItem.objects.filter(
                labeling_element__labeling_section__labeling=self.labeling
            ).count(),
            3,
        )
        self.assertEqual(
            QuestionRange.objects.filter(
                labeling_element__labeling_section__labeling=self.labeling
            ).count(),
            2,
        )

        expected_structure = self._simplify_structure(self.valid_payload["sections"])
        self.assertEqual(self._simplify_structure(response.data), expected_structure)

        persisted_structure = self.client.get(self.structure_url).data
        self.assertEqual(
            self._simplify_structure(persisted_structure), expected_structure
        )

    def test_put_denies_admin_without_edit_membership(self):
        self.client.force_authenticate(self.viewer_admin)

        response = self.client.put(self.structure_url, self.valid_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(LabelingSection.objects.filter(labeling=self.labeling).count(), 0)


class LabelingAgreementSummaryViewTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.request_user = User.objects.create_user(
            username="agreement_requester",
            email="agreement-requester@example.com",
            password="pass123",
        )
        self.annotator_a = User.objects.create_user(
            username="agreement_a",
            email="agreement-a@example.com",
            password="pass123",
        )
        self.annotator_b = User.objects.create_user(
            username="agreement_b",
            email="agreement-b@example.com",
            password="pass123",
        )
        self.annotator_c = User.objects.create_user(
            username="agreement_c",
            email="agreement-c@example.com",
            password="pass123",
        )
        self.annotator_d = User.objects.create_user(
            username="agreement_d",
            email="agreement-d@example.com",
            password="pass123",
        )
        self.annotator_e = User.objects.create_user(
            username="agreement_e",
            email="agreement-e@example.com",
            password="pass123",
        )
        self.outsider = User.objects.create_user(
            username="agreement_outsider",
            email="agreement-outsider@example.com",
            password="pass123",
        )

        self.project = Project.objects.create(
            name="Agreement Project",
            description="Agreement tests",
            created_by=self.request_user,
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=self.request_user,
            role=ProjectMembership.RoleChoices.OWNER,
        )

        self.labeling = Labeling.objects.create(
            project=self.project,
            title="Agreement Labeling",
            created_by=self.request_user,
            start_date=timezone.now().date(),
            final_date=timezone.now().date(),
            users_per_item=5,
        )
        LabelingMembership.objects.create(
            labeling=self.labeling,
            user=self.request_user,
            role=LabelingMembership.Role.OWNER,
        )
        for annotator in [
            self.annotator_a,
            self.annotator_b,
            self.annotator_c,
            self.annotator_d,
            self.annotator_e,
        ]:
            LabelingMembership.objects.create(
                labeling=self.labeling,
                user=annotator,
                role=LabelingMembership.Role.ANNOTATOR,
            )

        main_section = LabelingSection.objects.create(
            labeling=self.labeling,
            form_type=LabelingSection.FormType.MAIN,
            title="Smells",
            order=1,
        )
        self.question = LabelingElement.objects.create(
            labeling_section=main_section,
            order=1,
            text="Which smells apply?",
            question_type=LabelingElement.QuestionType.MULTIPLE_CHOICE,
            allow_multiple=True,
        )
        MultipleChoiceItem.objects.create(
            labeling_element=self.question,
            text="God Class",
            value=False,
            order=1,
        )
        MultipleChoiceItem.objects.create(
            labeling_element=self.question,
            text="Long Parameter List",
            value=False,
            order=2,
        )
        MultipleChoiceItem.objects.create(
            labeling_element=self.question,
            text="Data Class",
            value=False,
            order=3,
        )

        self.item = Item.objects.create(
            labeling=self.labeling,
            payload={},
            row_index=0,
            status="pending",
        )

        qid = str(self.question.id)

        # A's older answer (should be ignored by the item+user deduplication)
        Answer.objects.create(
            item=self.item,
            labeling=self.labeling,
            answered_by=self.annotator_a,
            answer_payload={qid: ["Data Class"]},
        )

        # answers that count (most recent per user on the item)
        Answer.objects.create(
            item=self.item,
            labeling=self.labeling,
            answered_by=self.annotator_a,
            answer_payload={qid: ["Data Class", "Long Parameter List"]},
        )
        Answer.objects.create(
            item=self.item,
            labeling=self.labeling,
            answered_by=self.annotator_b,
            answer_payload={qid: ["Data Class", "God Class"]},
        )
        Answer.objects.create(
            item=self.item,
            labeling=self.labeling,
            answered_by=self.annotator_c,
            answer_payload={qid: ["Data Class"]},
        )
        Answer.objects.create(
            item=self.item,
            labeling=self.labeling,
            answered_by=self.annotator_d,
            answer_payload={qid: ["Long Parameter List"]},
        )
        Answer.objects.create(
            item=self.item,
            labeling=self.labeling,
            answered_by=self.annotator_e,
            answer_payload={qid: ["Data Class", "God Class"]},
        )

        self.client = APIClient()
        self.url = f"/labelings/{self.labeling.id}/agreement-summary/"

    def test_returns_agreement_summary_for_multiple_choice_questions(self):
        self.client.force_authenticate(self.request_user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["min_agreement"], 2)
        self.assertEqual(response.data["max_min_agreement"], 5)
        self.assertEqual(len(response.data["questions"]), 1)

        summary = response.data["questions"][0]
        self.assertEqual(summary["question_id"], self.question.id)
        self.assertEqual(summary["possible_agreements"], 1)

        by_key = {option["key"]: option["agreement_count"] for option in summary["options"]}
        self.assertEqual(by_key.get("God Class"), 1)
        self.assertEqual(by_key.get("Long Parameter List"), 1)
        self.assertEqual(by_key.get("Data Class"), 1)

    def test_returns_summary_for_custom_min_agreement(self):
        self.client.force_authenticate(self.request_user)
        response = self.client.get(self.url, {"min_agreement": 3})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["min_agreement"], 3)
        self.assertEqual(response.data["max_min_agreement"], 5)

        summary = response.data["questions"][0]
        by_key = {option["key"]: option["agreement_count"] for option in summary["options"]}
        self.assertEqual(by_key.get("Data Class"), 1)
        self.assertEqual(by_key.get("God Class"), 0)
        self.assertEqual(by_key.get("Long Parameter List"), 0)

    def test_rejects_invalid_min_agreement(self):
        self.client.force_authenticate(self.request_user)
        response = self.client.get(self.url, {"min_agreement": 1})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "INVALID_MIN_AGREEMENT")

    def test_rejects_min_agreement_above_max(self):
        self.client.force_authenticate(self.request_user)
        response = self.client.get(self.url, {"min_agreement": 6})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "INVALID_MIN_AGREEMENT")

    def test_denies_access_for_outsider(self):
        self.client.force_authenticate(self.outsider)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TransferProjectPermsMigrationTest(TestCase):
    """0038 backfill: project edit roles turn into labeling memberships."""

    def _run(self):
        import importlib
        from django.apps import apps as django_apps

        module = importlib.import_module(
            "labeling.migrations.0038_transfer_project_perms_to_labeling"
        )
        module.forwards(django_apps, None)

    def test_backfills_creates_upgrades_and_preserves(self):
        User = get_user_model()
        owner = User.objects.create_user(username="mig_owner", password="p", email="mig-owner@x.com")
        contributor = User.objects.create_user(username="mig_contrib", password="p", email="mig-contrib@x.com")
        viewer_member = User.objects.create_user(username="mig_viewer", password="p", email="mig-viewer@x.com")
        annotator = User.objects.create_user(username="mig_annot", password="p", email="mig-annot@x.com")
        project_viewer = User.objects.create_user(username="mig_pviewer", password="p", email="mig-pviewer@x.com")
        already_owner = User.objects.create_user(username="mig_already", password="p", email="mig-already@x.com")

        project = Project.objects.create(name="Mig Project", created_by=owner)
        for user, role in [
            (owner, ProjectMembership.RoleChoices.OWNER),
            (contributor, ProjectMembership.RoleChoices.CONTRIBUTOR),
            (viewer_member, ProjectMembership.RoleChoices.CONTRIBUTOR),
            (annotator, ProjectMembership.RoleChoices.CONTRIBUTOR),
            (project_viewer, ProjectMembership.RoleChoices.VIEWER),
            (already_owner, ProjectMembership.RoleChoices.CONTRIBUTOR),
        ]:
            ProjectMembership.objects.create(project=project, user=user, role=role)

        today = timezone.now().date()
        labeling = Labeling.objects.create(
            project=project, title="Mig Labeling", created_by=owner,
            start_date=today, final_date=today,
        )
        LabelingMembership.objects.create(
            labeling=labeling, user=viewer_member, role=LabelingMembership.Role.VIEWER
        )
        LabelingMembership.objects.create(
            labeling=labeling, user=annotator, role=LabelingMembership.Role.ANNOTATOR
        )
        LabelingMembership.objects.create(
            labeling=labeling, user=already_owner, role=LabelingMembership.Role.OWNER
        )

        self._run()

        roles = dict(
            LabelingMembership.objects.filter(labeling=labeling).values_list("user_id", "role")
        )
        self.assertEqual(roles[owner.id], "owner")          # created
        self.assertEqual(roles[contributor.id], "admin")    # created
        self.assertEqual(roles[viewer_member.id], "admin")  # viewer promoted
        self.assertEqual(roles[annotator.id], "admin")      # annotator promoted
        self.assertEqual(roles[already_owner.id], "owner")  # owner is never demoted
        self.assertNotIn(project_viewer.id, roles)          # project viewer doesn't get in

    def test_is_idempotent(self):
        User = get_user_model()
        owner = User.objects.create_user(username="mig2_owner", password="p", email="mig2@x.com")
        project = Project.objects.create(name="Mig Project 2", created_by=owner)
        ProjectMembership.objects.create(
            project=project, user=owner, role=ProjectMembership.RoleChoices.OWNER
        )
        today = timezone.now().date()
        labeling = Labeling.objects.create(
            project=project, title="Mig Labeling 2", created_by=owner,
            start_date=today, final_date=today,
        )

        self._run()
        self._run()

        self.assertEqual(LabelingMembership.objects.filter(labeling=labeling).count(), 1)


class EditDashboardFolderFilterTest(TestCase):
    """Folders in /labelings_manage: `project` opens one, `ungrouped` returns the rest."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="folder_admin", password="pass123", email="folder@example.com", is_staff=True
        )
        self.my_project = Project.objects.create(name="Mine", created_by=self.user)
        ProjectMembership.objects.create(project=self.my_project, user=self.user, role="owner")
        # A project the user isn't a member of: it doesn't become a folder on
        # screen, even if they administer a labeling inside it (permission
        # lives on the labeling).
        self.other_project = Project.objects.create(name="Theirs", created_by=self.user)

        self.in_folder = self._labeling("In folder", self.my_project)
        self.no_project = self._labeling("No project", None)
        self.foreign_project = self._labeling("Foreign project", self.other_project)

    def _labeling(self, title, project):
        labeling = Labeling.objects.create(
            project=project,
            title=title,
            created_by=self.user,
            start_date=timezone.now().date(),
            final_date=timezone.now().date(),
        )
        LabelingMembership.objects.create(labeling=labeling, user=self.user, role="owner")
        return labeling

    def _titles(self, **params):
        client = APIClient()
        client.force_authenticate(self.user)
        response = client.get(reverse("labelings-editdashboard"), params)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return {row["labeling_name"] for row in response.data["results"]}

    def test_without_filters_returns_everything_editable(self):
        self.assertEqual(
            self._titles(), {"In folder", "No project", "Foreign project"}
        )

    def test_ungrouped_returns_only_labelings_without_a_visible_folder(self):
        self.assertEqual(self._titles(ungrouped="true"), {"No project", "Foreign project"})

    def test_project_filter_returns_only_that_folder(self):
        self.assertEqual(self._titles(project=self.my_project.id), {"In folder"})

    def test_ungrouped_row_reports_null_project_name(self):
        client = APIClient()
        client.force_authenticate(self.user)
        response = client.get(reverse("labelings-editdashboard"), {"project": ""})
        rows = {row["labeling_name"]: row["project_name"] for row in response.data["results"]}
        self.assertIsNone(rows["No project"])
