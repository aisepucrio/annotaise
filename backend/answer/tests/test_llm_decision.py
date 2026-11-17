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
from ..models import Answer
from test_helpers import AnswerTestsHelper

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
        AnswerTestsHelper.enroll(self.labeling, self.user1, self.user2)

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
        AnswerTestsHelper.enroll(self.labeling, self.user3)
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
