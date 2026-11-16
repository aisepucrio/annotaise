"""Dependency behavior across management, distribution, and submission."""

from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from time import sleep
from unittest import skipUnless
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import IntegrityError, close_old_connections, connection, transaction
from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from answer.models import Answer
from item.models import Item, ItemMembership
from ..models import DependsOn, Labeling, LabelingMembership, LabelingSection
from ..services.dependencies import create_dependency
from ..services import dependencies


class DependencyWorkflowTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="dependency-user", email="dependency@example.com", account_type="admin"
        )
        self.labelings = [
            Labeling.objects.create(
                title=title, created_by=self.user, final_date=timezone.now().date(),
                status=Labeling.Status.ACTIVE,
            )
            for title in ("Dependent", "Prerequisite", "Other prerequisite")
        ]
        self.dependent, self.prerequisite, self.other = self.labelings
        for labeling in self.labelings:
            LabelingMembership.objects.create(labeling=labeling, user=self.user, role="owner")
            LabelingSection.objects.create(labeling=labeling, title="Questions")
            Item.objects.create(labeling=labeling, row_index=0, payload={})
        self.item = self.dependent.items.get()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def depend(self):
        return create_dependency(self.dependent, self.prerequisite)

    def next_item(self, labeling=None, user=None):
        client = self.client
        if user is not None:
            client = APIClient()
            client.force_authenticate(user)
        return client.get(reverse("next-item", args=[(labeling or self.dependent).pk]))

    def submit(self, item=None):
        item = item or self.item
        return self.client.post(reverse("answers-list"), {
            "labeling": item.labeling_id, "item": item.pk, "answer_payload": {},
        }, format="json")

    def finish(self, labeling):
        labeling.status = Labeling.Status.FINISHED
        labeling.save(update_fields=["status"])

    def assert_blocked(self, response):
        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(response.data["code"], "UNFINISHED_DEPENDENCIES")

    def test_all_unfinished_statuses_block_without_creating_reservations(self):
        self.depend()
        for prerequisite_status in ("draft", "active", "archived", "in_progress"):
            with self.subTest(status=prerequisite_status):
                self.prerequisite.status = prerequisite_status
                self.prerequisite.save(update_fields=["status"])
                self.assert_blocked(self.next_item())
                self.assertFalse(ItemMembership.objects.filter(item=self.item).exists())

    def test_every_prerequisite_must_finish(self):
        self.depend()
        create_dependency(self.dependent, self.other)
        self.finish(self.prerequisite)
        self.assert_blocked(self.next_item())
        self.finish(self.other)
        self.assertEqual(self.next_item().status_code, 200)

    def test_real_answer_finishes_prerequisite_and_unlocks_dependent(self):
        self.depend()
        self.assert_blocked(self.next_item())
        self.assertEqual(self.next_item(self.prerequisite).status_code, 200)
        self.assertEqual(self.submit(self.prerequisite.items.get()).status_code, 201)
        self.prerequisite.refresh_from_db()
        self.assertEqual(self.prerequisite.status, Labeling.Status.FINISHED)
        self.assertEqual(self.next_item().status_code, 200)
        self.assertEqual(self.submit().status_code, 201)

    def test_exhausting_own_queue_unlocks_while_prerequisite_stays_open(self):
        """Gating is per user: nothing left *for him* is enough, the campaign
        does not have to be over — and it keeps blocking whoever still has work."""
        self.depend()
        self.prerequisite.users_per_item = 2
        self.prerequisite.save(update_fields=["users_per_item"])
        self.assertEqual(self.next_item(self.prerequisite).status_code, 200)
        self.assertEqual(self.submit(self.prerequisite.items.get()).status_code, 201)
        self.prerequisite.refresh_from_db()
        self.assertEqual(self.prerequisite.status, Labeling.Status.ACTIVE)
        self.assertEqual(self.next_item().status_code, 200)
        self.assertEqual(self.submit().status_code, 201)
        self.assert_blocked(self.next_item(labeling=self.dependent, user=self.newcomer()))

    def test_non_member_of_prerequisite_is_not_blocked_by_it(self):
        self.depend()
        newcomer = self.newcomer()
        LabelingMembership.objects.filter(labeling=self.prerequisite, user=newcomer).delete()
        self.assertEqual(self.next_item(user=newcomer).status_code, 200)

    def newcomer(self):
        """Another annotator, member of every labeling, with work left everywhere."""
        user = get_user_model().objects.create_user(
            username="dependency-newcomer", email="newcomer@example.com", account_type="normal",
        )
        for labeling in self.labelings:
            LabelingMembership.objects.create(labeling=labeling, user=user, role="annotator")
        return user

    def test_new_dependency_blocks_existing_reservation_and_submission(self):
        self.assertEqual(self.next_item().status_code, 200)
        reservation = ItemMembership.objects.get(item=self.item, user=self.user)
        self.depend()
        self.assert_blocked(self.next_item())
        self.assert_blocked(self.submit())
        self.assertFalse(Answer.objects.filter(item=self.item).exists())
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, "pending")
        self.assertTrue(ItemMembership.objects.filter(pk=reservation.pk).exists())
        self.finish(self.prerequisite)
        self.assertEqual(self.submit().status_code, 201)

    def test_reopening_prerequisite_blocks_reserved_item(self):
        self.depend()
        self.finish(self.prerequisite)
        self.assertEqual(self.next_item().status_code, 200)
        self.prerequisite.status = Labeling.Status.ACTIVE
        self.prerequisite.save(update_fields=["status"])
        self.assert_blocked(self.submit())

    def test_removing_dependency_unlocks_work(self):
        dependency = self.depend()
        self.assert_blocked(self.next_item())
        dependency.delete()
        self.assertEqual(self.next_item().status_code, 200)

    def test_form_and_per_person_assignment_cannot_bypass_dependencies(self):
        self.depend()
        for form_mode, strategy in ((True, "auto"), (False, "per_person")):
            with self.subTest(form_mode=form_mode, strategy=strategy):
                self.dependent.form_mode = form_mode
                self.dependent.distribution_strategy = strategy
                self.dependent.save(update_fields=["form_mode", "distribution_strategy"])
                self.assert_blocked(self.next_item())

    def test_anonymous_assignment_and_submission_enforce_dependencies(self):
        self.depend()
        self.dependent.distribution_strategy = "anonymous_mode"
        self.dependent.anonymous_token = uuid4()
        self.dependent.save(update_fields=["distribution_strategy", "anonymous_token"])
        self.client.force_authenticate(user=None)
        next_url = reverse("next-item-anonymous", args=[self.dependent.anonymous_token])
        submit_url = reverse("answer-submit-anonymous", args=[self.dependent.anonymous_token])
        payload = {"item": self.item.pk, "answer_payload": {}}
        self.assert_blocked(self.client.get(next_url))
        self.assert_blocked(self.client.post(submit_url, payload, format="json"))
        self.assertFalse(Answer.objects.filter(item=self.item).exists())
        self.finish(self.prerequisite)
        self.assertEqual(self.client.get(next_url).status_code, 200)
        self.assertEqual(self.client.post(submit_url, payload, format="json").status_code, 201)

    def test_dashboard_flags_blocked_work_instead_of_hiding_it(self):
        self.depend()
        url = reverse("labelings-dashboard")

        def row(response):
            self.assertEqual(response.status_code, 200, response.data)
            return next(r for r in response.data["results"] if r["id"] == self.dependent.pk)

        self.assertTrue(row(self.client.get(url))["blocked_by_dependencies"])
        self.finish(self.prerequisite)
        self.assertFalse(row(self.client.get(url))["blocked_by_dependencies"])

    def test_create_cannot_reference_uneditable_prerequisite(self):
        LabelingMembership.objects.filter(labeling=self.other, user=self.user).update(role="annotator")
        response = self.client.post(reverse("labeling-dependencies-list"), {
            "labeling": self.dependent.pk, "depends_on": self.other.pk,
        })
        self.assertEqual(response.status_code, 403)
        self.assertFalse(DependsOn.objects.filter(depends_on=self.other).exists())



class DependencyCycleTests(TestCase):
    """A cycle would leave every labeling in it blocked forever, so the service
    refuses the edge that closes one — however long the loop is.

    Only edges whose *pair* doesn't exist yet are tested here: the reverse of an
    existing edge is rejected one layer below, by `unique_labeling_dependency_pair`
    (see DependencyPairConstraintTests).
    """

    def setUp(self):
        self.labelings = {
            name: Labeling.objects.create(title=name, final_date=timezone.now().date())
            for name in "ABCDEF"
        }

    def chain(self, names):
        """Builds names[0] -> names[1] -> ... (each one depends on the next)."""
        for dependent, prerequisite in zip(names, names[1:]):
            create_dependency(self.labelings[dependent], self.labelings[prerequisite])

    def assert_cycle_rejected(self, dependent, prerequisite):
        with self.assertRaises(ValidationError) as caught:
            create_dependency(self.labelings[dependent], self.labelings[prerequisite])
        self.assertEqual(caught.exception.detail["code"], "CIRCULAR_DEPENDENCY")
        self.assertFalse(
            DependsOn.objects.filter(
                labeling=self.labelings[dependent], depends_on=self.labelings[prerequisite]
            ).exists()
        )

    def test_three_labeling_loop_is_rejected(self):
        """A depends on B, B on C — C depending on A would close the loop."""
        self.chain("ABC")
        self.assert_cycle_rejected("C", "A")
        self.assertEqual(DependsOn.objects.count(), 2)

    def test_any_edge_that_closes_a_chain_is_rejected(self):
        self.chain("ABCD")
        for dependent, prerequisite in (("D", "A"), ("D", "B"), ("C", "A")):
            with self.subTest(edge=f"{dependent}->{prerequisite}"):
                self.assert_cycle_rejected(dependent, prerequisite)
        self.assertEqual(DependsOn.objects.count(), 3)

    def test_loop_is_caught_whatever_the_insertion_order(self):
        """The same triangle, closed last by each of its three edges."""
        for rotation in ("ABC", "BCA", "CAB"):
            with self.subTest(closed_by=rotation):
                DependsOn.objects.all().delete()
                self.chain(rotation)
                self.assert_cycle_rejected(rotation[2], rotation[0])

    def test_long_chain_only_fails_on_the_closing_edge(self):
        self.chain("ABCDEF")
        self.assertEqual(DependsOn.objects.count(), 5)
        self.assert_cycle_rejected("F", "A")

    def test_shared_prerequisites_are_not_a_loop(self):
        """Diamond: A needs B and C, both need D. No cycle, all four allowed."""
        create_dependency(self.labelings["A"], self.labelings["B"])
        create_dependency(self.labelings["A"], self.labelings["C"])
        create_dependency(self.labelings["B"], self.labelings["D"])
        create_dependency(self.labelings["C"], self.labelings["D"])
        self.assertEqual(DependsOn.objects.count(), 4)

    def test_separate_chains_can_be_joined_when_no_loop_closes(self):
        self.chain("AB")
        self.chain("CD")
        create_dependency(self.labelings["B"], self.labelings["C"])
        self.assertEqual(DependsOn.objects.count(), 3)
        self.assert_cycle_rejected("D", "A")


class DependencyPairConstraintTests(TestCase):
    """Exercise the database directly, without the service's cycle check or lock."""

    def setUp(self):
        self.a, self.b, self.c = [
            Labeling.objects.create(title=title, final_date=timezone.now().date())
            for title in "ABC"
        ]

    def test_duplicate_and_reverse_pairs_are_rejected_in_either_direction(self):
        for labeling, prerequisite in ((self.a, self.b), (self.b, self.a)):
            with self.subTest(labeling=labeling.pk):
                original = DependsOn.objects.create(labeling=labeling, depends_on=prerequisite)
                for source, target in ((labeling, prerequisite), (prerequisite, labeling)):
                    with self.assertRaises(IntegrityError), transaction.atomic():
                        DependsOn.objects.create(labeling=source, depends_on=target)
                self.assertEqual(DependsOn.objects.count(), 1)
                original.delete()

    def test_update_cannot_create_reverse_of_existing_pair(self):
        DependsOn.objects.create(labeling=self.a, depends_on=self.b)
        other = DependsOn.objects.create(labeling=self.b, depends_on=self.c)
        with self.assertRaises(IntegrityError), transaction.atomic():
            DependsOn.objects.filter(pk=other.pk).update(depends_on=self.a)
        other.refresh_from_db()
        self.assertEqual(other.depends_on_id, self.c.pk)

    def test_reversing_one_existing_edge_preserves_its_new_direction(self):
        relation = DependsOn.objects.create(labeling=self.a, depends_on=self.b)
        DependsOn.objects.filter(pk=relation.pk).update(labeling=self.b, depends_on=self.a)
        relation.refresh_from_db()
        self.assertEqual((relation.labeling_id, relation.depends_on_id), (self.b.pk, self.a.pk))

    def test_distinct_pairs_can_share_a_labeling(self):
        DependsOn.objects.bulk_create([
            DependsOn(labeling=self.a, depends_on=self.b),
            DependsOn(labeling=self.a, depends_on=self.c),
            DependsOn(labeling=self.b, depends_on=self.c),
        ])
        self.assertEqual(DependsOn.objects.count(), 3)

    def test_self_dependency_is_still_rejected(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            DependsOn.objects.create(labeling=self.a, depends_on=self.a)


@skipUnless(connection.vendor == "postgresql", "Requires PostgreSQL transaction locks")
class ConcurrentDependencyTests(TransactionTestCase):
    def setUp(self):
        self.a, self.b, self.c, self.d = [
            Labeling.objects.create(title=title, final_date=timezone.now().date())
            for title in "ABCD"
        ]

    def run_concurrently(self, operations):
        start = Barrier(len(operations))
        original_reaches = dependencies._reaches

        def slow_reaches(*args, **kwargs):
            result = original_reaches(*args, **kwargs)
            # Widen the read/write race: without the graph lock both edits
            # validate the old graph before either commits its new edge.
            sleep(0.1)
            return result

        def run(operation):
            close_old_connections()
            try:
                start.wait(timeout=10)
                operation()
                return "created"
            except ValidationError as exc:
                return str(exc.detail.get("code"))
            finally:
                close_old_connections()

        with patch.object(dependencies, "_reaches", side_effect=slow_reaches):
            with ThreadPoolExecutor(max_workers=len(operations)) as executor:
                results = list(executor.map(run, operations))
        self.assertCountEqual(results, ["created", "CIRCULAR_DEPENDENCY"])

    def test_concurrent_opposite_edges_cannot_create_cycle(self):
        self.run_concurrently([
            lambda: create_dependency(self.a, self.b),
            lambda: create_dependency(self.b, self.a),
        ])
        self.assertEqual(DependsOn.objects.count(), 1)

    def test_concurrent_edges_with_disjoint_endpoints_cannot_create_cycle(self):
        create_dependency(self.b, self.c)
        create_dependency(self.d, self.a)
        self.run_concurrently([
            lambda: create_dependency(self.a, self.b),
            lambda: create_dependency(self.c, self.d),
        ])
        self.assertEqual(DependsOn.objects.count(), 3)


@skipUnless(connection.vendor == "postgresql", "Requires concurrent PostgreSQL writes")
class ConcurrentDependencyPairConstraintTests(TransactionTestCase):
    """Raw concurrent writes must be protected even when they bypass the service."""

    def setUp(self):
        self.a, self.b, self.c = [
            Labeling.objects.create(title=title, final_date=timezone.now().date())
            for title in "ABC"
        ]

    def assert_one_write_conflicts(self, operations):
        start = Barrier(len(operations))

        def run(operation):
            close_old_connections()
            try:
                start.wait(timeout=10)
                with transaction.atomic():
                    operation()
                return "saved"
            except IntegrityError as exc:
                return exc.__cause__.diag.constraint_name
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=len(operations)) as executor:
            results = list(executor.map(run, operations))
        self.assertCountEqual(results, ["saved", "unique_labeling_dependency_pair"])

    def test_concurrent_reverse_inserts_are_rejected_by_database(self):
        self.assert_one_write_conflicts([
            lambda: DependsOn.objects.create(labeling=self.a, depends_on=self.b),
            lambda: DependsOn.objects.create(labeling=self.b, depends_on=self.a),
        ])
        self.assertEqual(DependsOn.objects.count(), 1)

    def test_concurrent_reverse_updates_are_rejected_by_database(self):
        first = DependsOn.objects.create(labeling=self.a, depends_on=self.c)
        second = DependsOn.objects.create(labeling=self.b, depends_on=self.c)
        self.assert_one_write_conflicts([
            lambda: DependsOn.objects.filter(pk=first.pk).update(depends_on=self.b),
            lambda: DependsOn.objects.filter(pk=second.pk).update(depends_on=self.a),
        ])
        self.assertEqual(DependsOn.objects.count(), 2)
