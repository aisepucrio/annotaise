from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from project.models import Project
from project.models import ProjectMembership
from labeling.models import Labeling, LabelingMembership
from .models import Item
from .serializers import ItemSerializer
from django.core.files.uploadedfile import SimpleUploadedFile
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

        LabelingMembership.objects.create(
            labeling=self.labeling,
            user=self.owner,
            role=LabelingMembership.Role.OWNER,
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


class ImportItemsCsvViewTest(TestCase):
    """The labeling is created by a previous request, so a failed import must not leave it behind."""

    def setUp(self):
        User = get_user_model()
        self.owner = User.objects.create_user(
            username="import_owner",
            password="pass123",
            email="import_owner@example.com",
            account_type="admin",
        )

        self.project = Project.objects.create(
            name="Import Project",
            description="project for csv import",
            created_by=self.owner,
        )
        ProjectMembership.objects.create(
            project=self.project,
            user=self.owner,
            role=ProjectMembership.RoleChoices.OWNER,
        )

        self.labeling = Labeling.objects.create(
            project=self.project,
            title="CSV a importar",
            created_by=self.owner,
            start_date=timezone.now().date(),
            final_date=timezone.now().date(),
        )
        LabelingMembership.objects.create(
            labeling=self.labeling,
            user=self.owner,
            role=LabelingMembership.Role.OWNER,
        )

        self.client = APIClient()
        self.client.force_authenticate(self.owner)
        self.url = reverse("import-items-csv", args=[self.labeling.id])

    def test_valid_csv_imports_items(self):
        upload = SimpleUploadedFile(
            "itens.csv",
            b"titulo,descricao\nTenis,Bom estado\nCamisa,Nova\n",
            content_type="text/csv",
        )

        response = self.client.put(self.url, {"file": upload}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Labeling.objects.filter(id=self.labeling.id).exists())
        self.assertEqual(Item.objects.filter(labeling=self.labeling).count(), 2)

        self.labeling.refresh_from_db()
        self.assertEqual(self.labeling.column_names, ["titulo", "descricao"])

    def test_unreadable_csv_deletes_the_labeling(self):
        # Unterminated quote: pandas raises while parsing.
        upload = SimpleUploadedFile(
            "quebrado.csv",
            b'titulo,descricao\n"Tenis,Bom estado\n',
            content_type="text/csv",
        )

        response = self.client.put(self.url, {"file": upload}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Labeling.objects.filter(id=self.labeling.id).exists())
        self.assertEqual(Item.objects.filter(labeling_id=self.labeling.id).count(), 0)

    def test_row_with_extra_column_deletes_the_labeling(self):
        # Parsing succeeds here: pandas turns the extra column into the index,
        # and the failure only shows up when the items are inserted.
        upload = SimpleUploadedFile(
            "coluna_a_mais.csv",
            b"titulo,descricao\nTenis,Bom estado,sobrando\n",
            content_type="text/csv",
        )

        response = self.client.put(self.url, {"file": upload}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Labeling.objects.filter(id=self.labeling.id).exists())
        self.assertEqual(Item.objects.filter(labeling_id=self.labeling.id).count(), 0)

    def test_non_csv_file_deletes_the_labeling(self):
        upload = SimpleUploadedFile(
            "planilha.txt",
            b"titulo,descricao\nTenis,Bom estado\n",
            content_type="text/plain",
        )

        response = self.client.put(self.url, {"file": upload}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Labeling.objects.filter(id=self.labeling.id).exists())
