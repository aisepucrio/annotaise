from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from project.models import Project
from project.models import ProjectMembership
from labeling.models import Labeling
from .models import Item
from .serializers import ItemSerializer
from django.utils import timezone
import csv
import io

class ItemSerializerTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="testuser", password="pass")
        self.project = Project.objects.create(name="Test Project", created_by=self.user)
        self.labeling = Labeling.objects.create(
            project=self.project,
            title="Test Labeling",
            created_by=self.user,
            start_date=timezone.now().date(),
            final_date=timezone.now().date(),
        )
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


class ExportImportedItemsCsvViewTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.owner = User.objects.create_user(
            username="item_owner",
            password="pass123",
            email="owner@example.com",
            account_type="admin",
        )
        self.outsider = User.objects.create_user(
            username="item_outsider",
            password="pass123",
            email="outsider@example.com",
            account_type="admin",
        )

        self.project = Project.objects.create(
            name="Export Project",
            description="project for csv export",
            created_by=self.owner,
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=self.owner,
            role=ProjectMembership.RoleChoices.OWNER,
        )

        self.labeling = Labeling.objects.create(
            project=self.project,
            title="CSV Importado",
            created_by=self.owner,
            start_date=timezone.now().date(),
            final_date=timezone.now().date(),
            column_names=["id_externo", "texto", "observacao"],
        )

        Item.objects.create(
            labeling=self.labeling,
            row_index=1,
            payload={
                "id_externo": 2,
                "texto": 'linha com "aspas"',
                "observacao": "segunda linha",
            },
            status="pending",
        )
        Item.objects.create(
            labeling=self.labeling,
            row_index=0,
            payload={
                "id_externo": 1,
                "texto": "linha, com virgula",
                "observacao": "primeira linha",
            },
            status="pending",
        )

        self.client = APIClient()
        self.url = reverse("export-imported-items-csv", args=[self.labeling.id])

    def test_owner_can_download_reconstructed_imported_csv(self):
        self.client.force_authenticate(self.owner)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("text/csv", response["Content-Type"])
        self.assertIn("csv-importado_imported.csv", response["Content-Disposition"])

        content = response.content.decode("utf-8")
        rows = list(csv.reader(io.StringIO(content)))

        self.assertEqual(rows[0], ["id_externo", "texto", "observacao"])
        self.assertEqual(
            rows[1],
            ["1", "linha, com virgula", "primeira linha"],
        )
        self.assertEqual(
            rows[2],
            ["2", 'linha com "aspas"', "segunda linha"],
        )

    def test_admin_without_project_permission_cannot_download_csv(self):
        self.client.force_authenticate(self.outsider)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
