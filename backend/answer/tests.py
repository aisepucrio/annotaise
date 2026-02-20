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
from .models import Answer
from .serializers import AnswerSerializer

class AnswerSerializerTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="joao", password="123")
        self.project = Project.objects.create(
            name="Test Project",
            created_by=self.user,
        )
        self.labeling = Labeling.objects.create(
            title="Test Labeling",
            created_by=self.user,
            project=self.project,
            start_date=now().date(),
            final_date=now().date(),
        )
        self.labeling_section = LabelingSection.objects.create(
            labeling=self.labeling,
            title="Test Section",
            order=1,
        )
        self.question = LabelingElement.objects.create(
            labeling_section=self.labeling_section,
            text="Test Question",
            question_type=LabelingElement.QuestionType.TEXT,
            order=1,
        )
        self.item = Item.objects.create(
            labeling=self.labeling,
            payload={"text": "Sample item"},
            row_index=1,
        )
    
    def test_serialization_success(self):
        answer = Answer.objects.create(
            labeling=self.labeling,
            item=self.item,
            answered_by=self.user,
            answer_payload={"color": "blue"},
            created_at=now(),
        )
        data = AnswerSerializer(answer).data
        self.assertEqual(data["labeling"], self.labeling.id)
        self.assertEqual(data["item"], self.item.id)
        self.assertEqual(data["answer_payload"], {"color": "blue"})
    
    def test_deserialization_success(self):
        payload = {
            "labeling": self.labeling.id,
            "item": self.item.id,
            "labeling_question": self.question.id,
            "answered_by": self.user.id,
            "answer_payload": {"color": "red"},
        }
        class request():
            user = self.user

        ser = AnswerSerializer(data=payload,context={'request':request()})
        self.assertTrue(ser.is_valid(), ser.errors)
        obj = ser.save()
        self.assertTrue(isinstance(obj, Answer))
        self.assertEqual(obj.answer_payload, {"color": "red"})

    def test_deserialization_failure(self):
        bad_payload = {
            "labeling": self.labeling.id,
            # item faltando
            "labeling_question": self.question.id,
            "answered_by": self.user.id,
            "answer_payload": "not a dict",  # inválido
        }
        ser = AnswerSerializer(data=bad_payload)
        self.assertFalse(ser.is_valid())
        self.assertIn("item", ser.errors)
        #TODO funcao que valida o payload como dict


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
