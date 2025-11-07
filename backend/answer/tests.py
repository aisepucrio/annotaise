from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils.timezone import now
from item.models import Item 
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
            labeling_question=self.question,
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
        ser = AnswerSerializer(data=payload)
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