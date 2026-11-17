from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from ..models import Project, ProjectMembership
from ..serializers import ProjectSerializer, ProjectMembershipSerializer
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
            "id": 999,  # attempt to override the read-only id
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
            "joined_at": "2000-01-01T00:00:00Z",  # ignored, read-only
        }
        serializer = ProjectMembershipSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        membership = serializer.save()
        self.assertEqual(membership.user, self.member)
        self.assertEqual(membership.role, ProjectMembership.RoleChoices.CONTRIBUTOR)
        self.assertNotEqual(
            membership.joined_at.isoformat(), "2000-01-01T00:00:00+00:00"
        )