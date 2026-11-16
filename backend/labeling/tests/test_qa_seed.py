from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from answer.models import Answer
from item.models import Item, ItemMembership
from project.models import Project
from user.models import UserGroupMembership
from ..models import DependsOn, Labeling, LabelingMembership
from ..services.qa_seed import PROJECT_PREFIX, SCENARIOS


class WorkflowQASeedTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = get_user_model().objects.create_user(
            username="qa-owner", email="qa-owner@example.com", account_type="admin",
        )
        output = StringIO()
        call_command("seed_workflow_qa", admin_email=cls.owner.email, no_input=True,
                     demo_password="qa-test-password", stdout=output)
        cls.output = output.getvalue()
        cls.annotators = [
            get_user_model().objects.get(username=f"qa_geral_{cls.owner.pk}_{key}")
            for key in ("a", "b", "livre")
        ]

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def labeling(self, scenario, number=1):
        title = next(title for key, title, *_ in SCENARIOS if key == scenario)
        return Labeling.objects.get(project__name=PROJECT_PREFIX + title, title=f"{title} {number:02d}")

    def next_item(self, labeling):
        return self.client.get(reverse("next-item", args=[labeling.pk]))

    def submit(self, labeling, item_id):
        return self.client.post(reverse("answers-list"), {
            "labeling": labeling.pk, "item": item_id, "answer_payload": {},
        }, format="json")

    def finish(self, labeling):
        for _ in range(labeling.items.count()):
            response = self.next_item(labeling)
            self.assertEqual(response.status_code, 200, response.data)
            response = self.submit(labeling, response.data["item"]["id"])
            self.assertEqual(response.status_code, 201, response.data)

    def test_seed_has_five_usable_simple_labelings_per_scenario(self):
        self.assertEqual(Project.objects.count(), 8)
        self.assertEqual(Labeling.objects.count(), 40)
        self.assertEqual(DependsOn.objects.count(), 14)
        for key, title, form_mode, strategy in SCENARIOS:
            labelings = Labeling.objects.filter(project__name=PROJECT_PREFIX + title)
            self.assertEqual(labelings.count(), 5)
            for labeling in labelings:
                self.assertEqual((labeling.form_mode, labeling.distribution_strategy), (form_mode, strategy))
                elements = labeling.sections.get().elements.all()
                self.assertCountEqual(elements.values_list("question_type", flat=True), ["context", "multiple_choice", "text"])
                self.assertFalse(elements.filter(required=True).exists())
                self.assertEqual(elements.get(question_type="multiple_choice").multiple_choice_items.count(), 3)
                self.assertTrue(all(item.payload.get("contexto") for item in labeling.items.all()))
                self.assertTrue(LabelingMembership.objects.filter(labeling=labeling, user=self.owner, role="owner").exists())
        self.assertTrue(all(user.check_password("qa-test-password") for user in self.annotators))
        self.assertFalse(UserGroupMembership.objects.filter(user=self.annotators[2]).exists())

    def test_anonymous_form_accepts_multiple_empty_responses(self):
        labeling = self.labeling("anonymous_forms")
        self.client.force_authenticate(None)
        next_url = reverse("next-item-anonymous", args=[labeling.anonymous_token])
        submit_url = reverse("answer-submit-anonymous", args=[labeling.anonymous_token])
        for _ in range(2):
            response = self.client.get(next_url)
            self.assertEqual(response.status_code, 200, response.data)
            response = self.client.post(submit_url, {"item": response.data["item"]["id"], "answer_payload": {}}, format="json")
            self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(labeling.answers.filter(answered_by=None).count(), 2)
        self.assertEqual(labeling.items.get().status, "pending")

    def test_anonymous_items_finish_after_three_empty_responses(self):
        labeling = self.labeling("anonymous_items")
        self.client.force_authenticate(None)
        for _ in range(3):
            response = self.client.get(reverse("next-item-anonymous", args=[labeling.anonymous_token]))
            self.assertEqual(response.status_code, 200, response.data)
            response = self.client.post(reverse("answer-submit-anonymous", args=[labeling.anonymous_token]), {
                "item": response.data["item"]["id"], "answer_payload": {},
            }, format="json")
            self.assertEqual(response.status_code, 201, response.data)
        labeling.refresh_from_db()
        self.assertEqual(labeling.status, "finished")

    def test_identified_form_accepts_one_empty_response_per_user(self):
        labeling = self.labeling("forms")
        for user in (self.owner, self.annotators[0]):
            self.client.force_authenticate(user)
            response = self.next_item(labeling)
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(self.submit(labeling, response.data["item"]["id"]).status_code, 201)
            self.assertEqual(self.next_item(labeling).data["code"], "NO_LABELINGS_TO_ANSWER")
        self.assertEqual(labeling.items.get().status, "pending")

    def test_group_quotas_require_both_groups_and_exclude_ungrouped_user(self):
        labeling = self.labeling("groups")
        self.client.force_authenticate(self.annotators[2])
        self.assertEqual(self.next_item(labeling).data["code"], "NO_LABELINGS_TO_ANSWER")
        self.client.force_authenticate(self.owner)
        response = self.next_item(labeling)
        self.assertEqual(response.status_code, 200, response.data)
        item_id = response.data["item"]["id"]
        self.assertEqual(self.submit(labeling, item_id).status_code, 201)
        self.assertEqual(Item.objects.get(pk=item_id).status, "pending")
        self.client.force_authenticate(self.annotators[1])
        response = self.next_item(labeling)
        self.assertEqual(response.data["item"]["id"], item_id)
        self.assertEqual(self.submit(labeling, item_id).status_code, 201)
        self.assertEqual(Item.objects.get(pk=item_id).status, "finished")
        self.assertEqual(Answer.objects.filter(item_id=item_id, responded_as__isnull=False).count(), 2)

    def test_mixed_group_quota_accepts_an_ungrouped_annotator_in_any_slot(self):
        labeling = self.labeling("groups", 2)
        self.client.force_authenticate(self.annotators[2])
        response = self.next_item(labeling)
        self.assertEqual(response.status_code, 200, response.data)
        item_id = response.data["item"]["id"]
        self.assertEqual(self.submit(labeling, item_id).status_code, 201)
        answer = Answer.objects.get(item_id=item_id)
        self.assertIsNone(answer.responded_as_id)
        for user in (self.annotators[0], self.annotators[1]):
            self.client.force_authenticate(user)
            response = self.next_item(labeling)
            self.assertEqual(response.data["item"]["id"], item_id)
            self.assertEqual(self.submit(labeling, item_id).status_code, 201)
        self.assertEqual(Item.objects.get(pk=item_id).status, "finished")

    def test_per_person_items_are_numeric_ids_and_only_reach_their_assignee(self):
        labeling = self.labeling("per_person")
        for user in (self.owner, *self.annotators):
            self.client.force_authenticate(user)
            response = self.next_item(labeling)
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(response.data["item"]["payload"]["user_id"], user.pk)
            self.assertEqual(self.submit(labeling, response.data["item"]["id"]).status_code, 201)

    def test_dependencies_are_blocked_unlocked_and_reject_cycles(self):
        first, second = self.labeling("dependencies"), self.labeling("dependencies", 2)
        self.assertEqual(self.next_item(first).data["code"], "UNFINISHED_DEPENDENCIES")
        self.assertEqual(self.next_item(second).data["code"], "UNFINISHED_DEPENDENCIES")
        self.assertEqual(self.next_item(self.labeling("dependencies", 4)).status_code, 200)
        prerequisite = self.labeling("no_groups")
        for target in (first, second):
            response = self.client.post(reverse("labeling-dependencies-list"), {
                "labeling": prerequisite.pk, "depends_on": target.pk,
            })
            self.assertEqual(response.status_code, 400, response.data)
        self.finish(prerequisite)
        self.assertEqual(self.next_item(first).status_code, 200)
        self.assertEqual(self.next_item(second).data["code"], "UNFINISHED_DEPENDENCIES")
        self.finish(first)
        self.assertEqual(self.next_item(second).status_code, 200)

    def test_anonymous_dependencies_block_and_allow_public_access_as_seeded(self):
        self.client.force_authenticate(None)
        blocked = self.labeling("anonymous_dependencies")
        allowed = self.labeling("anonymous_dependencies", 4)
        response = self.client.get(reverse("next-item-anonymous", args=[blocked.anonymous_token]))
        self.assertEqual(response.data["code"], "UNFINISHED_DEPENDENCIES")
        response = self.client.get(reverse("next-item-anonymous", args=[allowed.anonymous_token]))
        self.assertEqual(response.status_code, 200, response.data)

    def test_repeating_command_preserves_responses_reservations_tokens_edits_and_passwords(self):
        labeling = self.labeling("forms")
        response = self.next_item(labeling)
        self.assertEqual(self.submit(labeling, response.data["item"]["id"]).status_code, 201)
        self.next_item(self.labeling("no_groups"))
        labeling.guide = "Guia editado durante o QA"
        labeling.save(update_fields=["guide"])
        before = {
            "answers": list(Answer.objects.values_list("pk", flat=True)),
            "reservations": list(ItemMembership.objects.values_list("pk", flat=True)),
            "items": list(Item.objects.values_list("pk", flat=True)),
            "tokens": list(Labeling.objects.order_by("pk").values_list("anonymous_token", flat=True)),
        }
        output = StringIO()
        call_command("seed_workflow_qa", admin_email=self.owner.email, no_input=True,
                     demo_password="different-password", stdout=output)
        self.assertIn("0 rotulações novas, 40 preservadas", output.getvalue())
        self.assertEqual(Project.objects.count(), 8)
        self.assertEqual(Labeling.objects.count(), 40)
        self.assertEqual(list(Answer.objects.values_list("pk", flat=True)), before["answers"])
        self.assertEqual(list(ItemMembership.objects.values_list("pk", flat=True)), before["reservations"])
        self.assertEqual(list(Item.objects.values_list("pk", flat=True)), before["items"])
        self.assertEqual(list(Labeling.objects.order_by("pk").values_list("anonymous_token", flat=True)), before["tokens"])
        labeling.refresh_from_db()
        self.assertEqual(labeling.guide, "Guia editado durante o QA")
        for user in self.annotators:
            user.refresh_from_db()
            self.assertTrue(user.check_password("qa-test-password"))

    def test_invalid_admin_does_not_create_data(self):
        for options in ({"no_input": True}, {"admin_email": self.annotators[0].email, "no_input": True}):
            with self.assertRaises(CommandError):
                call_command("seed_workflow_qa", stdout=StringIO(), **options)
        self.assertEqual(Labeling.objects.count(), 40)

    def test_account_collision_rolls_back_earlier_seed_writes(self):
        other_owner = get_user_model().objects.create_user(
            username="other-owner", email="other-owner@example.com", account_type="admin",
        )
        get_user_model().objects.create_user(
            username="existing-unrelated-account",
            email=f"qa_geral_{other_owner.pk}_b@annotaise.local",
        )
        with self.assertRaises(CommandError):
            call_command("seed_workflow_qa", admin_email=other_owner.email, no_input=True, stdout=StringIO())
        self.assertFalse(get_user_model().objects.filter(username=f"qa_geral_{other_owner.pk}_a").exists())
        self.assertFalse(Project.objects.filter(created_by=other_owner).exists())
        self.assertEqual(Labeling.objects.count(), 40)
