from django.test import TestCase
from .serializers import LabelingSerializer, LabelingSectionSerializer, LabelingElementSerializer, MultipleChoiceItemSerializer, QuestionRangeSerializer, LabelingMembershipSerializer
from .models import Labeling, LabelingSection, LabelingElement, MultipleChoiceItem, QuestionRange, LabelingMembership
from project.models import Project
from django.contrib.auth import get_user_model

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



class LabelingSerializerTest(BaseSerializerTest):
    def test_serialization_success(self):
        serializer = LabelingSerializer(self.labeling)
        self.assertEqual(serializer.data['title'], "Test Labeling")
        self.assertEqual(serializer.data['project'], self.project.id)

    def test_deserialization_success(self):
        payload = {
            "id": 999,
            "title": "New Labeling",
            "project": self.project.id,
            "created_by": self.user.id
        }
        serializer = LabelingSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        obj = serializer.save()
        self.assertNotEqual(obj.id, 999)

    def test_deserialization_failure(self):
        bad_payload = {
            # project is required
            "title": "Test"
        }
        serializer = LabelingSerializer(data=bad_payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("project", serializer.errors)

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
        other_user = User.objects.create_user(username="otheruser", password="pwd123")
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