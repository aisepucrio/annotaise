"""Covers the cursor traversal of paginated listings.

The frontend consumes all of them via infinite scroll: request a page,
follow the `next` cursor, concatenate. These tests guarantee that traversal
returns each record exactly once, without skipping or repeating, including
the sensitive cases: a page built as a dict (dashboards), ordering by an
annotated field (answers), and rows dropped within a page (group quotas).
"""

from urllib.parse import parse_qs, urlsplit

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from answer.models import Answer
from item.models import Item
from labeling.models import Labeling, LabelingMembership
from project.models import Project, ProjectMembership

User = get_user_model()


class CursorPaginationTests(TestCase):
    """Walks each paginated listing from start to finish, following `next`."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(
            username="cursor_admin",
            password="pass123",
            email="cursor_admin@example.com",
            account_type="admin",
            is_staff=True,
        )

        today = timezone.now().date()
        cls.projects = []
        cls.labelings = []

        for project_index in range(3):
            project = Project.objects.create(
                name=f"Projeto {project_index}",
                description="descricao",
                created_by=cls.admin,
            )
            ProjectMembership.objects.create(
                project=project,
                user=cls.admin,
                role=ProjectMembership.RoleChoices.OWNER,
            )
            cls.projects.append(project)

            for labeling_index in range(2):
                labeling = Labeling.objects.create(
                    project=project,
                    title=f"Rotulacao {project_index}-{labeling_index}",
                    created_by=cls.admin,
                    start_date=today,
                    final_date=today,
                )
                LabelingMembership.objects.create(
                    labeling=labeling,
                    user=cls.admin,
                    role=LabelingMembership.Role.OWNER,
                )
                cls.labelings.append(labeling)

        # Extra members so the membership listing actually paginates.
        cls.members = []
        for member_index in range(6):
            member = User.objects.create_user(
                username=f"cursor_member_{member_index}",
                password="pass123",
                email=f"cursor_member_{member_index}@example.com",
            )
            cls.members.append(member)
            LabelingMembership.objects.create(
                labeling=cls.labelings[0],
                user=member,
                role=LabelingMembership.Role.ANNOTATOR,
            )
            ProjectMembership.objects.create(
                project=cls.projects[0],
                user=member,
                role=ProjectMembership.RoleChoices.VIEWER,
            )

        # Items and answers: several items share row_index to exercise the
        # cursor's tie-break offset on the annotated field.
        cls.answers_labeling = cls.labelings[0]
        for row_index in range(4):
            item = Item.objects.create(
                labeling=cls.answers_labeling,
                payload={"texto": f"linha {row_index}"},
                row_index=row_index,
            )
            for member in cls.members[:2]:
                Answer.objects.create(
                    item=item,
                    labeling=cls.answers_labeling,
                    answered_by=member,
                    answer_payload={"resposta": row_index},
                )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def walk_cursor(self, url, page_size=2, params=None):
        """Follows `next` to the end and returns (pages, concatenated items)."""
        query = {"page_size": page_size, **(params or {})}
        pages = []
        items = []

        while True:
            response = self.client.get(url, query)
            self.assertEqual(response.status_code, 200, response.data)
            self.assertIn("results", response.data)
            pages.append(response.data)
            items.extend(response.data["results"])

            next_link = response.data.get("next")
            if not next_link:
                break

            # The token is percent-encoded in the link; sending it back raw invalidates the cursor.
            cursor = parse_qs(urlsplit(next_link).query)["cursor"][0]
            query = {"page_size": page_size, "cursor": cursor, **(params or {})}

            # Safety guard: without this, a cursor that never advances would loop forever.
            self.assertLess(len(pages), 50, "cursor não terminou de paginar")

        return pages, items

    def assert_matches_full_listing(self, url, params=None):
        """The paginated traversal must return the same set of ids as the full listing."""
        full = self.client.get(url, {"page_size": 100, **(params or {})})
        self.assertEqual(full.status_code, 200, full.data)
        expected_ids = [row["id"] for row in full.data["results"]]

        pages, items = self.walk_cursor(url, params=params)
        walked_ids = [row["id"] for row in items]

        self.assertGreater(len(pages), 1, "cenário não paginou; teste perderia o sentido")
        self.assertEqual(walked_ids, expected_ids)
        self.assertEqual(len(set(walked_ids)), len(walked_ids), "cursor repetiu registros")
        self.assertEqual(pages[0]["count"], len(expected_ids))
        self.assertIsNone(pages[0]["previous"])

    def test_labeling_edit_dashboard_walks_every_row(self):
        self.assert_matches_full_listing(reverse("labelings-editdashboard"))

    def test_labeling_dashboard_walks_every_row(self):
        # Needs pending items unanswered by the admin to show up.
        for labeling in self.labelings[1:]:
            Item.objects.create(labeling=labeling, payload={}, row_index=0, status="pending")

        self.assert_matches_full_listing(reverse("labelings-dashboard"))

    def test_labeling_memberships_walk_every_row(self):
        url = reverse("labelings-list-labeling-memberships", args=[self.labelings[0].id])
        self.assert_matches_full_listing(url)

    def test_project_dashboard_walks_every_row(self):
        self.assert_matches_full_listing(reverse("projects-dashboard"))

    def test_project_memberships_walk_every_row(self):
        self.assert_matches_full_listing(reverse("project-memberships-list"))

    def test_user_dashboard_walks_every_row(self):
        self.assert_matches_full_listing(reverse("admin-users-user-dashboard"))

    def test_answers_walk_every_row_in_csv_order(self):
        url = reverse("answer-list-by-labeling", args=[self.answers_labeling.id])
        self.assert_matches_full_listing(url)

        _, items = self.walk_cursor(url)
        row_indexes = [row["item_detail"]["row_index"] for row in items]
        self.assertEqual(row_indexes, sorted(row_indexes), "cursor quebrou a ordem do CSV")

    def test_labeling_dashboard_orders_by_last_opened(self):
        """The most recently opened labeling comes first; never-opened ones come after."""
        for labeling in self.labelings[1:]:
            Item.objects.create(labeling=labeling, payload={}, row_index=0, status="pending")

        url = reverse("labelings-dashboard")
        never_opened = [row["id"] for row in self.client.get(url, {"page_size": 100}).data["results"]]
        self.assertGreater(len(never_opened), 2)

        # With nothing opened, the tie-break is -id (newest first).
        self.assertEqual(never_opened, sorted(never_opened, reverse=True))

        # Opens two in ascending id order, so the recency-expected result
        # ([opened_last, opened_first]) contradicts what the -id tie-break
        # would give — otherwise the test would pass even if last_opened
        # were ignored.
        opened_first, opened_last = never_opened[-2], never_opened[-1]
        self.assertGreater(opened_first, opened_last, "ids precisam contrariar a ordem de abertura")

        for labeling_id in (opened_first, opened_last):
            response = self.client.get(reverse("labelings-detail", args=[labeling_id]))
            self.assertEqual(response.status_code, 200, response.data)

        ordered = [row["id"] for row in self.client.get(url, {"page_size": 100}).data["results"]]
        self.assertEqual(ordered[:2], [opened_last, opened_first])
        self.assertEqual(set(ordered[2:]), set(never_opened) - {opened_first, opened_last})

    def test_last_opened_ordering_survives_cursor_traversal(self):
        """Never-opened labelings share a single position; none may be dropped by pagination."""
        for labeling in self.labelings[1:]:
            Item.objects.create(labeling=labeling, payload={}, row_index=0, status="pending")

        url = reverse("labelings-dashboard")
        everything = [row["id"] for row in self.client.get(url, {"page_size": 100}).data["results"]]
        # Opens only one: the rest stay tied on NEVER_OPENED, which is exactly
        # the case where a cursor over a nullable column could lose rows.
        self.client.get(reverse("labelings-detail", args=[everything[-1]]))

        self.assert_matches_full_listing(url)

    def test_retrieve_without_membership_records_nothing(self):
        """A manager who isn't a member of the labeling can open it without creating a membership."""
        manager = User.objects.create_user(
            username="cursor_manager",
            password="pass123",
            email="cursor_manager@example.com",
            account_type="admin",
        )
        ProjectMembership.objects.create(
            project=self.projects[0],
            user=manager,
            role=ProjectMembership.RoleChoices.OWNER,
        )
        self.client.force_authenticate(manager)

        response = self.client.get(reverse("labelings-detail", args=[self.labelings[0].id]))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(
            LabelingMembership.objects.filter(labeling=self.labelings[0], user=manager).exists()
        )

    def test_retrieve_only_touches_last_opened_at(self):
        """The UPDATE must not touch any other membership field."""
        membership = LabelingMembership.objects.get(labeling=self.labelings[0], user=self.admin)
        membership.items_done = 7
        membership.save(update_fields=["items_done"])
        before = LabelingMembership.objects.values("items_done", "role", "joined_at").get(pk=membership.pk)

        self.client.get(reverse("labelings-detail", args=[self.labelings[0].id]))

        after = LabelingMembership.objects.values("items_done", "role", "joined_at").get(pk=membership.pk)
        self.assertEqual(before, after)
        self.assertIsNotNone(LabelingMembership.objects.get(pk=membership.pk).last_opened_at)

    def test_search_filter_survives_cursor_traversal(self):
        _, items = self.walk_cursor(
            reverse("labelings-editdashboard"),
            page_size=1,
            params={"search": "Projeto 0"},
        )
        self.assertEqual(
            {row["project_name"] for row in items},
            {"Projeto 0"},
            "cursor vazou registros fora do filtro de busca",
        )
