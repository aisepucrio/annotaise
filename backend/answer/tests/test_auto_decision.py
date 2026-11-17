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