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
from labeling.models import Labeling, LabelingSection, LabelingElement
from test_helpers import AnswerTestsHelper

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
        AnswerTestsHelper.enroll(self.labeling, self.user)

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
