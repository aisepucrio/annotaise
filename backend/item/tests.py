from django.test import TestCase
from django.contrib.auth import get_user_model
from project.models import Project
from labeling.models import Labeling
from .models import Item
from .serializers import ItemSerializer

class ItemSerializerTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="testuser", password="pass")
        self.project = Project.objects.create(name="Test Project", created_by=self.user)
        self.labeling = Labeling.objects.create(project=self.project, title="Test Labeling", created_by=self.user)
        self.item = Item.objects.create(labeling=self.labeling, payload={"a": 1}, row_index=0)

    def test_serialization_success(self):
        ser = ItemSerializer(self.item)
        self.assertEqual(ser.data["labeling"], self.labeling.id)
        self.assertEqual(ser.data["payload"], {"a": 1})
        self.assertEqual(ser.data["row_index"], 0)

    def test_deserialization_success(self):
        payload = {
            "id": 999,                # should be ignored (read-only)
            "labeling": self.labeling.id,
            "payload": {"b": 2},
            "row_index": 1
        }
        ser = ItemSerializer(data=payload)
        self.assertTrue(ser.is_valid(), ser.errors)
        obj = ser.save()
        self.assertNotEqual(obj.id, 999)

    def test_deserialization_failure_missing_labeling(self):
        bad = {
            "payload": {"b": 2},
            "row_index": 1
        }
        ser = ItemSerializer(data=bad)
        self.assertFalse(ser.is_valid())
        self.assertIn("labeling", ser.errors)

    def test_deserialization_failure_invalid_payload(self):
        bad = {
            "labeling": self.labeling.id,
            "payload": "not a dict",
            "row_index": 1
        }
        ser = ItemSerializer(data=bad)
        self.assertFalse(ser.is_valid())
        self.assertIn("payload", ser.errors)
