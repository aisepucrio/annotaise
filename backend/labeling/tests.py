from django.test import TestCase
from django.urls import reverse
from rest_framework import serializers as drf_serializers, status
from rest_framework.test import APIClient
from .serializers import LabelingSerializer, LabelingSectionSerializer, LabelingElementSerializer, MultipleChoiceItemSerializer, QuestionRangeSerializer, LabelingMembershipSerializer
from .models import Labeling, LabelingSection, LabelingElement, MultipleChoiceItem, QuestionRange, LabelingMembership
from project.models import Project, ProjectMembership
from django.contrib.auth import get_user_model

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
            created_by=self.user
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

    def test_deserialization_success(self):
        payload = {
            "id": 999,
            "labeling": self.labeling.id,
            "title": "New Section",
            "order": 2
        }
        serializer = LabelingSectionSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        obj = serializer.save()
        self.assertNotEqual(obj.id, 999)

    def test_deserialization_failure(self):
        bad_payload = {
            # labeling is required
            "title": "Test"
        }
        serializer = LabelingSectionSerializer(data=bad_payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("labeling", serializer.errors)

class LabelingElementSerializerTest(BaseSerializerTest):
    def test_serialization_success(self):
        serializer = LabelingElementSerializer(self.element)
        self.assertEqual(serializer.data['text'], "Test Question")
        self.assertEqual(serializer.data['question_type'], "text")

    def test_deserialization_success(self):
        payload = {
            "id": 999,
            "labeling_section": self.section.id,
            "text": "New Question",
            "question_type": "text",
            "order": 2,
            "required": False
        }
        serializer = LabelingElementSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        obj = serializer.save()
        self.assertNotEqual(obj.id, 999)

    def test_deserialization_failure(self):
        bad_payload = {
            # labeling_section is required
            "text": "Test"
        }
        serializer = LabelingElementSerializer(data=bad_payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("labeling_section", serializer.errors)

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

    def test_deserialization_success(self):
        payload = {
            "id": 999,
            "labeling_element": self.element.id,
            "text": "New Choice",
            "value": False,
            "order": 2
        }
        serializer = MultipleChoiceItemSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        obj = serializer.save()
        self.assertNotEqual(obj.id, 999)

    def test_deserialization_failure(self):
        bad_payload = {
            # labeling_element is required
            "text": "Test Choice"
        }
        serializer = MultipleChoiceItemSerializer(data=bad_payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("labeling_element", serializer.errors)

class QuestionRangeSerializerTest(BaseSerializerTest):
    def setUp(self):
        super().setUp()
        # criado um segundo labeling element para uso nos testes de desserialização
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
            step=1
        )
 
    def test_serialization_success(self):
        serializer = QuestionRangeSerializer(self.range)
        self.assertEqual(serializer.data['start'], 0)
        self.assertEqual(serializer.data['end'], 10)
        self.assertEqual(serializer.data['step'], 1)
 
    def test_deserialization_success(self):
        payload = {
            "id": 999,
            # usa o segundo elemento criado para testar desserialização em um elemento diferente
            "labeling_element": self.element2.id,
            "start": 1,
            "end": 5,
            "step": 0.5
        }
        serializer = QuestionRangeSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        obj = serializer.save()
        self.assertNotEqual(obj.id, 999)

    def test_deserialization_failure(self):
        bad_payload = {
            "labeling_element": self.element.id,
            "start": 10,
            "end": 5  
        }
        serializer = QuestionRangeSerializer(data=bad_payload)
        self.assertFalse(serializer.is_valid())

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
            "user": other_user.id,  # usa outro usuário criado para o teste pra nao violar a unicidade da relacao
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
        self.owner = User.objects.create_user(username="label_owner", password="pass123", email="owner@example.com")
        self.viewer = User.objects.create_user(username="label_viewer", password="pass123", email="viewer@example.com")
        self.staff = User.objects.create_user(
            username="label_staff", password="pass123", email="staff@example.com", is_staff=True
        )
        self.other_owner = User.objects.create_user(
            username="label_other_owner", password="pass123", email="other-owner@example.com"
        )

        self.project = Project.objects.create(
            name="Main Project",
            description="Primary",
            created_by=self.owner,
        )
        self.other_project = Project.objects.create(
            name="Other Project",
            description="Second",
            created_by=self.other_owner,
        )

        ProjectMembership.objects.create(
            project=self.project,
            user=self.owner,
            role=ProjectMembership.RoleChoices.OWNER,
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=self.viewer,
            role=ProjectMembership.RoleChoices.VIEWER,
        )
        ProjectMembership.objects.create(
            project=self.other_project,
            user=self.other_owner,
            role=ProjectMembership.RoleChoices.OWNER,
        )

        self.labeling = Labeling.objects.create(
            project=self.project,
            title="Owned Labeling",
            created_by=self.owner,
        )
        LabelingMembership.objects.create(
            labeling=self.labeling,
            user=self.owner,
            role="owner",
        )
        LabelingMembership.objects.create(
            labeling=self.labeling,
            user=self.viewer,
            role="annotator",
        )

        self.foreign_labeling = Labeling.objects.create(
            project=self.other_project,
            title="Foreign Labeling",
            created_by=self.other_owner,
        )
        LabelingMembership.objects.create(
            labeling=self.foreign_labeling,
            user=self.other_owner,
            role="owner",
        )

        self.client = APIClient()
        self.list_url = reverse("labelings-list")

    def test_list_returns_only_labelings_where_user_is_member(self):
        self.client.force_authenticate(self.viewer)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Owned Labeling")

    def test_staff_sees_all_labelings(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_create_requires_project_owner(self):
        self.client.force_authenticate(self.viewer)
        payload = {"title": "Blocked Labeling", "project": self.project.id}
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_create_labeling_and_becomes_owner_membership(self):
        self.client.force_authenticate(self.owner)
        payload = {"title": "API Labeling", "project": self.project.id}
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        labeling_id = response.data["id"]
        self.assertTrue(
            LabelingMembership.objects.filter(
                labeling_id=labeling_id, user=self.owner, role="owner"
            ).exists()
        )

    def test_destroy_requires_labeling_owner(self):
        self.client.force_authenticate(self.viewer)
        url = reverse("labelings-detail", args=[self.labeling.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
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
            username="lm_staff", password="pass123", email="staff@example.com", is_staff=True
        )

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
        )
        self.labeling_two = Labeling.objects.create(
            project=self.project,
            title="Labeling Two",
            created_by=self.owner,
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
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_staff_sees_all_memberships(self):
        self.client.force_authenticate(self.staff)
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

    def test_owner_cannot_add_user_outside_project(self):
        self.client.force_authenticate(self.owner)
        payload = {
            "labeling": self.labeling_one.id,
            "user": self.outsider.id,
            "role": "annotator",
        }
        response = self.client.post(self.memberships_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(
            LabelingMembership.objects.filter(
                labeling=self.labeling_one, user=self.outsider
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
