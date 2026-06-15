from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils.timezone import now
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import patch
from item.models import Item 
from item.models import ItemMembership
from project.models import Project
from labeling.models import Labeling, LabelingSection, LabelingElement, MultipleChoiceItem
from user.models import UserGroup, UserGroupMembership
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


class AutomaticDecisionTest(TestCase):
    """
    Tests for the automatic-decision mechanism with users_per_item > 1.

    The item should only be marked 'finished' when there is a clear winner
    among the answers (no tie). A tied vote must leave the item pending.
    """

    def setUp(self):
        User = get_user_model()
        self.user1 = User.objects.create_user(username="dec_user1", email="b@g.com", password="123")
        self.user2 = User.objects.create_user(username="dec_user2", email="c@g.com", password="123")

        self.project = Project.objects.create(
            name="Decision Project",
            created_by=self.user1,
        )
        self.labeling = Labeling.objects.create(
            title="Decision Labeling",
            created_by=self.user1,
            project=self.project,
            decision=True,
            users_per_item=2,
            start_date=now().date(),
            final_date=now().date(),
        )
        self.section = LabelingSection.objects.create(
            labeling=self.labeling,
            form_type=LabelingSection.FormType.MAIN,
            title="Main Section",
            order=1,
        )
        self.decisive_question = LabelingElement.objects.create(
            labeling_section=self.section,
            text="Is this correct?",
            question_type=LabelingElement.QuestionType.MULTIPLE_CHOICE,
            order=1,
        )
        self.labeling.decisive_question = self.decisive_question
        self.labeling.save()

        self.item = Item.objects.create(
            labeling=self.labeling,
            payload={"text": "Sample"},
            row_index=1,
        )
        ItemMembership.objects.create(item=self.item, user=self.user1)
        ItemMembership.objects.create(item=self.item, user=self.user2)

        self.client = APIClient()
        self.url = reverse("answers-list")

    def _answer(self, user, value):
        self.client.force_authenticate(user)
        return self.client.post(
            self.url,
            {
                "labeling": self.labeling.id,
                "item": self.item.id,
                "answer_payload": {str(self.decisive_question.id): value},
            },
            format="json",
        )

    def test_item_not_finished_when_answers_tied(self):
        """A 1-1 tie must not finish the item."""
        r1 = self._answer(self.user1, "yes")
        r2 = self._answer(self.user2, "no")

        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED)

        self.item.refresh_from_db()
        self.assertNotEqual(self.item.status, "finished")

        self.labeling.refresh_from_db()
        self.assertNotEqual(self.labeling.status, "finished")

    def test_item_finishes_on_agreement(self):
        """Unanimous agreement (2-0) must finish the item."""
        r1 = self._answer(self.user1, "yes")
        r2 = self._answer(self.user2, "yes")

        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED)

        self.item.refresh_from_db()
        self.assertEqual(self.item.status, "finished")

    def test_decision_payload_accumulates_votes(self):
        """decision_payload must track vote counts for each answer value."""
        self._answer(self.user1, "yes")
        self._answer(self.user2, "yes")

        self.item.refresh_from_db()
        self.assertEqual(self.item.decision_payload, {"yes": 2})


class LLMDecisionTieBreakTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user1 = User.objects.create_user(
            username="llm_user1",
            email="llm1@example.com",
            password="123",
        )
        self.user2 = User.objects.create_user(
            username="llm_user2",
            email="llm2@example.com",
            password="123",
        )
        self.user3 = User.objects.create_user(
            username="llm_user3",
            email="llm3@example.com",
            password="123",
        )

        self.project = Project.objects.create(
            name="LLM Decision Project",
            created_by=self.user1,
        )
        self.labeling = Labeling.objects.create(
            title="LLM Decision Labeling",
            created_by=self.user1,
            project=self.project,
            decision=True,
            decision_mode=Labeling.DecisionMode.LLM,
            users_per_item=2,
            start_date=now().date(),
            final_date=now().date(),
        )
        self.section = LabelingSection.objects.create(
            labeling=self.labeling,
            form_type=LabelingSection.FormType.MAIN,
            title="Main Section",
            order=1,
        )
        self.decisive_question = LabelingElement.objects.create(
            labeling_section=self.section,
            text="Should be accepted?",
            question_type=LabelingElement.QuestionType.MULTIPLE_CHOICE,
            order=1,
        )
        self.context_element = LabelingElement.objects.create(
            labeling_section=self.section,
            text="Código do item",
            question_type=LabelingElement.QuestionType.CONTEXT,
            context_type=LabelingElement.ContextType.CODE,
            column_name="code_snippet",
            order=2,
        )
        MultipleChoiceItem.objects.create(
            labeling_element=self.decisive_question,
            text="yes",
            order=1,
        )
        MultipleChoiceItem.objects.create(
            labeling_element=self.decisive_question,
            text="no",
            order=2,
        )
        self.labeling.decisive_question = self.decisive_question
        self.labeling.save(update_fields=["decisive_question"])

        self.item = Item.objects.create(
            labeling=self.labeling,
            payload={"code_snippet": "print('hello')"},
            row_index=1,
        )

        ItemMembership.objects.create(item=self.item, user=self.user1)
        ItemMembership.objects.create(item=self.item, user=self.user2)

        self.client = APIClient()
        self.url = reverse("answers-list")

    def _answer(self, user, value):
        self.client.force_authenticate(user)
        return self.client.post(
            self.url,
            {
                "labeling": self.labeling.id,
                "item": self.item.id,
                "answer_payload": {str(self.decisive_question.id): value},
            },
            format="json",
        )

    @patch("answer.views.run_llm_tiebreak_decision")
    def test_llm_tiebreak_finishes_item_when_has_winner(self, mocked_llm):
        mocked_llm.return_value = {
            "winner": "yes",
            "tied": False,
            "models": [],
            "vote_count": {"yes": 3, "no": 2},
            "valid_votes": 5,
        }

        r1 = self._answer(self.user1, "yes")
        r2 = self._answer(self.user2, "no")

        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED)
        mocked_llm.assert_called_once()
        call_kwargs = mocked_llm.call_args.kwargs
        self.assertIn("contexts", call_kwargs)
        self.assertNotIn("item_payload", call_kwargs)
        self.assertEqual(call_kwargs["contexts"][0]["context_type"], "code")

        self.item.refresh_from_db()
        self.assertEqual(self.item.status, "finished")
        self.assertEqual(self.item.final_decision_source, "llm")
        self.assertEqual(self.item.final_decision_value, "yes")
        self.assertTrue(self.item.llm_tiebreak_attempted)
        self.assertEqual(self.item.decision_payload, {"yes": 2, "no": 1})
        llm_answer = (
            Answer.objects
            .filter(item=self.item, labeling=self.labeling, answered_by__username="llm_tiebreak_bot")
            .first()
        )
        self.assertIsNotNone(llm_answer)
        self.assertEqual(
            llm_answer.answer_payload.get(str(self.decisive_question.id)),
            "yes",
        )
        self.assertEqual(
            Answer.objects.filter(item=self.item, labeling=self.labeling).count(),
            3,
        )

    @patch("answer.views.run_llm_tiebreak_decision")
    def test_llm_tiebreak_runs_once_when_result_is_tie(self, mocked_llm):
        mocked_llm.return_value = {
            "winner": None,
            "tied": True,
            "models": [],
            "vote_count": {"yes": 2, "no": 2},
            "valid_votes": 4,
        }

        r1 = self._answer(self.user1, "yes")
        r2 = self._answer(self.user2, "no")

        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED)
        mocked_llm.assert_called_once()

        self.item.refresh_from_db()
        self.assertNotEqual(self.item.status, "finished")
        self.assertTrue(self.item.llm_tiebreak_attempted)
        self.assertEqual(self.item.final_decision_source, None)

        ItemMembership.objects.create(item=self.item, user=self.user3)
        r3 = self._answer(self.user3, "yes")
        self.assertEqual(r3.status_code, status.HTTP_201_CREATED)
        self.assertEqual(mocked_llm.call_count, 1)

        self.item.refresh_from_db()
        self.assertEqual(self.item.status, "finished")
        self.assertEqual(self.item.final_decision_source, "human")
        self.assertEqual(self.item.final_decision_value, "yes")

    @patch("answer.views.run_llm_tiebreak_decision")
    def test_manual_mode_does_not_call_llm_tiebreak(self, mocked_llm):
        self.labeling.decision_mode = Labeling.DecisionMode.MANUAL
        self.labeling.save(update_fields=["decision_mode"])

        r1 = self._answer(self.user1, "yes")
        r2 = self._answer(self.user2, "no")

        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED)
        mocked_llm.assert_not_called()

        self.item.refresh_from_db()
        self.assertNotEqual(self.item.status, "finished")
        self.assertFalse(self.item.llm_tiebreak_attempted)

    @patch("answer.views.run_llm_tiebreak_decision")
    def test_returns_warning_when_video_context_is_not_supported(self, mocked_llm):
        self.context_element.context_type = LabelingElement.ContextType.VIDEO
        self.context_element.save(update_fields=["context_type"])
        self.item.payload = {"code_snippet": "https://example.com/video.mp4"}
        self.item.save(update_fields=["payload"])

        mocked_llm.return_value = {
            "winner": None,
            "tied": False,
            "models": [],
            "vote_count": {},
            "valid_votes": 0,
            "error": "UNSUPPORTED_VIDEO_CONTEXT",
            "error_message": (
                "Não foi possível fazer essa pergunta decisiva porque existe contexto "
                "do tipo 'video' que a decisão por LLM não consegue rotular."
            ),
        }

        self._answer(self.user1, "yes")
        response = self._answer(self.user2, "no")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("decision_warning", response.data)
        self.assertIn("tipo 'video'", response.data["decision_warning"])

    @patch("answer.views.run_llm_tiebreak_decision")
    def test_returns_warning_when_audio_context_is_not_supported(self, mocked_llm):
        self.context_element.context_type = LabelingElement.ContextType.AUDIO
        self.context_element.save(update_fields=["context_type"])
        self.item.payload = {"code_snippet": "https://example.com/audio.mp3"}
        self.item.save(update_fields=["payload"])

        mocked_llm.return_value = {
            "winner": None,
            "tied": False,
            "models": [],
            "vote_count": {},
            "valid_votes": 0,
            "error": "UNSUPPORTED_AUDIO_CONTEXT",
            "error_message": (
                "Não foi possível fazer essa pergunta decisiva porque existe contexto "
                "do tipo 'audio' que a decisão por LLM não consegue rotular."
            ),
        }

        self._answer(self.user1, "yes")
        response = self._answer(self.user2, "no")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("decision_warning", response.data)
        self.assertIn("tipo 'audio'", response.data["decision_warning"])


class LabelingCompletionTest(TestCase):
    """
    Tests that the labeling transitions to 'finished' only when every item
    in it has been finished.
    """

    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="comp_user", password="123")

        self.project = Project.objects.create(
            name="Completion Project",
            created_by=self.user,
        )
        self.labeling = Labeling.objects.create(
            title="Completion Labeling",
            created_by=self.user,
            project=self.project,
            decision=False,
            users_per_item=1,
            start_date=now().date(),
            final_date=now().date(),
        )
        self.section = LabelingSection.objects.create(
            labeling=self.labeling,
            form_type=LabelingSection.FormType.MAIN,
            title="Main Section",
            order=1,
        )
        self.question = LabelingElement.objects.create(
            labeling_section=self.section,
            text="Question",
            question_type=LabelingElement.QuestionType.TEXT,
            order=1,
        )

        self.item1 = Item.objects.create(
            labeling=self.labeling,
            payload={"text": "Item 1"},
            row_index=1,
        )
        self.item2 = Item.objects.create(
            labeling=self.labeling,
            payload={"text": "Item 2"},
            row_index=2,
        )
        ItemMembership.objects.create(item=self.item1, user=self.user)
        ItemMembership.objects.create(item=self.item2, user=self.user)

        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.url = reverse("answers-list")

    def _answer(self, item):
        return self.client.post(
            self.url,
            {
                "labeling": self.labeling.id,
                "item": item.id,
                "answer_payload": {str(self.question.id): "done"},
            },
            format="json",
        )

    def test_labeling_not_finished_while_items_remain(self):
        """Answering only one of two items must not finish the labeling."""
        r = self._answer(self.item1)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

        self.labeling.refresh_from_db()
        self.assertNotEqual(self.labeling.status, "finished")

    def test_labeling_finishes_when_all_items_done(self):
        """Answering every item must transition the labeling to 'finished'."""
        r1 = self._answer(self.item1)
        r2 = self._answer(self.item2)

        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED)

        self.labeling.refresh_from_db()
        self.assertEqual(self.labeling.status, "finished")


class GroupQuotaAnswerEnforcementTest(TestCase):
    """
    Cotas por grupo são checadas na distribuição, mas reservas não consomem
    slots: dois usuários podem reservar o mesmo item enquanto o slot 'any'
    ainda está aberto. A criação da resposta precisa rechecar a cota sob o
    lock do item e rejeitar (NO_GROUP_SLOT) quem ficou sem slot compatível.
    """

    def setUp(self):
        User = get_user_model()
        self.user_a = User.objects.create_user(username="quota_a", email="qa@g.com", password="123")
        self.user_b1 = User.objects.create_user(username="quota_b1", email="qb1@g.com", password="123")
        self.user_b2 = User.objects.create_user(username="quota_b2", email="qb2@g.com", password="123")

        self.group_a = UserGroup.objects.create(name="grupo-quota-a", created_by=self.user_a)
        UserGroupMembership.objects.create(group=self.group_a, user=self.user_a)

        self.project = Project.objects.create(name="Quota Project", created_by=self.user_a)
        self.labeling = Labeling.objects.create(
            title="Quota Labeling",
            created_by=self.user_a,
            project=self.project,
            users_per_item=2,
            items_per_group={self.group_a.name: 1, "any": 1},
            start_date=now().date(),
            final_date=now().date(),
        )
        self.section = LabelingSection.objects.create(
            labeling=self.labeling,
            form_type=LabelingSection.FormType.MAIN,
            title="Main",
            order=1,
        )
        self.question = LabelingElement.objects.create(
            labeling_section=self.section,
            text="Question",
            question_type=LabelingElement.QuestionType.TEXT,
            order=1,
        )
        self.item = Item.objects.create(
            labeling=self.labeling,
            payload={"text": "Quota item"},
            row_index=1,
        )

        # Simula reservas concorrentes: os dois usuários sem grupo reservaram o
        # item enquanto o slot 'any' ainda estava aberto.
        ItemMembership.objects.create(item=self.item, user=self.user_b1)
        ItemMembership.objects.create(item=self.item, user=self.user_b2)
        ItemMembership.objects.create(item=self.item, user=self.user_a)

        self.url = reverse("answers-list")

    def _answer_as(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client.post(
            self.url,
            {
                "labeling": self.labeling.id,
                "item": self.item.id,
                "answer_payload": {str(self.question.id): "ok"},
            },
            format="json",
        )

    def test_second_groupless_answer_is_rejected_when_any_slot_full(self):
        r1 = self._answer_as(self.user_b1)
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        answer_b1 = Answer.objects.get(answered_by=self.user_b1)
        self.assertIsNone(answer_b1.responded_as)

        # O slot 'any' já foi preenchido; só resta o slot do grupo A.
        r2 = self._answer_as(self.user_b2)
        self.assertEqual(r2.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(r2.data["code"], "NO_GROUP_SLOT")
        self.assertFalse(Answer.objects.filter(answered_by=self.user_b2).exists())
        # A reserva é liberada para o usuário poder buscar outro item.
        self.assertFalse(
            ItemMembership.objects.filter(item=self.item, user=self.user_b2).exists()
        )

        # O usuário do grupo A ainda consegue preencher o slot do grupo,
        # e o item finaliza com a cota respeitada.
        r3 = self._answer_as(self.user_a)
        self.assertEqual(r3.status_code, status.HTTP_201_CREATED)
        answer_a = Answer.objects.get(answered_by=self.user_a)
        self.assertEqual(answer_a.responded_as, self.group_a)
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, "finished")
