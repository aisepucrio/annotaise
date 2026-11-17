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
from user.models import UserGroup, UserGroupMembership
from ..models import Answer
from test_helpers import AnswerTestsHelper

class GroupQuotaAnswerEnforcementTest(TestCase):
    """
    Group quotas are checked at distribution time, but reservations don't
    consume slots: two users can reserve the same item while the 'any' slot
    is still open. Answer creation must recheck the quota under the item
    lock and reject (NO_GROUP_SLOT) whoever ends up without a compatible slot.
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

        # Simulates concurrent reservations: the two groupless users reserved the
        # item while the 'any' slot was still open.
        ItemMembership.objects.create(item=self.item, user=self.user_b1)
        ItemMembership.objects.create(item=self.item, user=self.user_b2)
        ItemMembership.objects.create(item=self.item, user=self.user_a)
        AnswerTestsHelper.enroll(self.labeling, self.user_b1, self.user_b2, self.user_a)

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

        # The 'any' slot is already filled; only group A's slot remains.
        r2 = self._answer_as(self.user_b2)
        self.assertEqual(r2.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(r2.data["code"], "NO_GROUP_SLOT")
        self.assertFalse(Answer.objects.filter(answered_by=self.user_b2).exists())
        # The reservation is released so the user can fetch another item.
        self.assertFalse(
            ItemMembership.objects.filter(item=self.item, user=self.user_b2).exists()
        )

        # The group A user can still fill the group's slot,
        # and the item finishes with the quota respected.
        r3 = self._answer_as(self.user_a)
        self.assertEqual(r3.status_code, status.HTTP_201_CREATED)
        answer_a = Answer.objects.get(answered_by=self.user_a)
        self.assertEqual(answer_a.responded_as, self.group_a)
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, "finished")
