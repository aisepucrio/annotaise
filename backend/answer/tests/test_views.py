from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils.timezone import now
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from item.models import Item 
from item.models import ItemMembership
from project.models import Project
from labeling.models import Labeling, LabelingSection, LabelingElement
from ..models import Answer
from test_helpers import AnswerTestsHelper

class AnswerViewsetCreateTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="answer_user",
            email="answer_user@example.com",
            password="123",
        )

        self.project = Project.objects.create(
            name="Answer API Project",
            created_by=self.user,
        )
        self.labeling = Labeling.objects.create(
            title="Decision Labeling",
            created_by=self.user,
            project=self.project,
            decision=True,
            users_per_item=1,
            start_date=now().date(),
            final_date=now().date(),
        )

        self.section = LabelingSection.objects.create(
            labeling=self.labeling,
            form_type=LabelingSection.FormType.MAIN,
            title="Main",
            order=1,
        )
        self.decisive_question = LabelingElement.objects.create(
            labeling_section=self.section,
            text="Pergunta decisiva",
            question_type=LabelingElement.QuestionType.MULTIPLE_CHOICE,
            order=1,
        )
        self.labeling.decisive_question = self.decisive_question
        self.labeling.save()

        self.item = Item.objects.create(
            labeling=self.labeling,
            payload={"text": "Sample item"},
            row_index=1,
        )

        ItemMembership.objects.create(
            item=self.item,
            user=self.user,
        )
        AnswerTestsHelper.enroll(self.labeling, self.user)

        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.url = reverse("answers-list")

    def test_decision_missing_answer_returns_400_without_partial_writes(self):
        payload = {
            "labeling": self.labeling.id,
            "item": self.item.id,
            "answer_payload": {"999999": "valor-irrelevante"},
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "Resposta da pergunta decisiva não encontrada.",
        )
        self.assertFalse(
            Answer.objects.filter(labeling=self.labeling, item=self.item).exists()
        )
        self.assertTrue(
            ItemMembership.objects.filter(item=self.item, user=self.user).exists()
        )
        self.item.refresh_from_db()
        self.assertIsNone(self.item.decision_payload)

    def test_viewer_cannot_post_answer(self):
        """'viewer' is read-only: even with a reserved item, it cannot register an answer."""
        viewer = get_user_model().objects.create_user(
            username="answer_viewer", email="answer_viewer@example.com", password="123"
        )
        AnswerTestsHelper.enroll(self.labeling, viewer, role="viewer")
        ItemMembership.objects.create(item=self.item, user=viewer)

        client = APIClient()
        client.force_authenticate(viewer)
        response = client.post(
            self.url,
            {
                "labeling": self.labeling.id,
                "item": self.item.id,
                "answer_payload": {str(self.decisive_question.id): "aceitar"},
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Answer.objects.filter(answered_by=viewer).exists())

    def test_non_member_cannot_post_answer(self):
        """The permission used to only define has_object_permission, which create never calls."""
        outsider = get_user_model().objects.create_user(
            username="answer_outsider", email="answer_outsider@example.com", password="123"
        )
        client = APIClient()
        client.force_authenticate(outsider)
        response = client.post(
            self.url,
            {
                "labeling": self.labeling.id,
                "item": self.item.id,
                "answer_payload": {str(self.decisive_question.id): "aceitar"},
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Answer.objects.filter(answered_by=outsider).exists())

    def test_decision_valid_answer_creates_and_consumes_membership(self):
        payload = {
            "labeling": self.labeling.id,
            "item": self.item.id,
            "answer_payload": {str(self.decisive_question.id): "aceitar"},
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Answer.objects.filter(labeling=self.labeling, item=self.item).exists()
        )
        self.assertFalse(
            ItemMembership.objects.filter(item=self.item, user=self.user).exists()
        )
        self.item.refresh_from_db()
        self.assertEqual(self.item.decision_payload, {"aceitar": 1})