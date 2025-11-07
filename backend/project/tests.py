from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils.timezone import now
from .models import (
    Project
)
from .serializers import (
    ProjectSerializer
)
from labeling.models import (
    Labeling,
    LabelingSection,
    LabelingElement
)

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
            "created_by": self.user.id
        }
        serializer = ProjectSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        obj = serializer.save()
        self.assertNotEqual(obj.id, 999)

    def test_deserialization_failure(self):
        bad_payload = {
            # name is required
            "description": "Test"
        }
        serializer = ProjectSerializer(data=bad_payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)


