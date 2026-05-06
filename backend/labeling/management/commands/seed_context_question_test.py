from __future__ import annotations

from datetime import timedelta
from textwrap import dedent
from typing import Any

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from answer.models import Answer, BackgroundAnswer
from item.models import Item
from labeling.models import (
    Labeling,
    LabelingElement,
    LabelingMembership,
    LabelingSection,
    MultipleChoiceItem,
    QuestionRange,
)
from project.models import Project, ProjectMembership


PROJECT_NAME = "Context Question Test"
PROJECT_DESCRIPTION = (
    "Seeded project for validating all context modules, question modules, "
    "follow-ups, summaries, and agreement."
)
LABELING_TITLE = "Extensive Context and Question Test"

LABELING_GUIDE_MARKDOWN = dedent(
    """
    # Extensive form test

    This test was created for QA purposes, to have a single labeling with every context type, question type, and follow-up type.   
    """
).strip()

COLUMN_NAMES = [
    "ctx_text",
    "ctx_number",
    "ctx_date",
    "ctx_category",
    "ctx_code",
    "ctx_image",
    "ctx_audio",
    "ctx_video",
    "ctx_pdf",
]

AUDIO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3"
VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
YOUTUBE_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw"
PDF_URL = (
    "data:application/pdf;base64,"
    "JVBERi0xLjQKMSAwIG9iajw8IC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUiA+PmVuZG9iagoyIDAgb2JqPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj5lbmRvYmoKMyAwIG9iajw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgNjEyIDc5Ml0gL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNCAwIFIgPj4gPj4gL0NvbnRlbnRzIDUgMCBSID4+ZW5kb2JqCjQgMCBvYmo8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgPj5lbmRvYmoKNSAwIG9iajw8IC9MZW5ndGggMTMyID4+c3RyZWFtCkJUIC9GMSAyNCBUZiA3MiA3MjAgVGQgKEFubm90QUlTRSBQREYgY29udGV4dCBzZWVkKSBUaiAwIC0zNiBUZCAvRjEgMTIgVGYgKFRoaXMgaXMgYSByZWFsIGlubGluZSBQREYgdXNlZCBmb3IgaWZyYW1lIHRlc3RpbmcuKSBUaiBFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU2IDAwMDAwIG4gCjAwMDAwMDAxMTEgMDAwMDAgbiAKMDAwMDAwMDIzNSAwMDAwMCBuIAowMDAwMDAwMzAzIDAwMDAwIG4gCnRyYWlsZXI8PCAvU2l6ZSA2IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgo0ODQKJSVFT0YK"
)
IMAGE_URLS = [
    "https://commons.wikimedia.org/wiki/Special:FilePath/Example.jpg",
    "https://commons.wikimedia.org/wiki/Special:FilePath/PNG_transparency_demonstration_1.png",
    "https://commons.wikimedia.org/wiki/Special:FilePath/JPEG_example_JPG_RIP_100.jpg",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Lenna_(test_image).png",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Fractal_Broccoli.jpg",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Fronalpstock_big.jpg",
]

SAMPLE_ROWS: list[dict[str, Any]] = [
    {
        "ctx_text": dedent(
            """
            **Item 01** with markdown.

            - Line A
            - Line B

            Test link: https://example.com
            """
        ).strip(),
        "ctx_number": 12.5,
        "ctx_date": "2026-05-05",
        "ctx_category": "Category Alpha",
        "ctx_code": dedent(
            """
            function sum(a, b) {
              return a + b;
            }

            console.log(sum(2, 3));
            """
        ).strip(),
        "ctx_image": IMAGE_URLS[0],
        "ctx_audio": AUDIO_URL,
        "ctx_video": VIDEO_URL,
        "ctx_pdf": PDF_URL,
    },
    {
        "ctx_text": "Simple text with **bold** and `inline code`.",
        "ctx_number": 98,
        "ctx_date": "2026-06-12",
        "ctx_category": "Category Beta",
        "ctx_code": dedent(
            """
            SELECT id, status
            FROM items
            WHERE status = 'pending'
            ORDER BY id DESC;
            """
        ).strip(),
        "ctx_image": IMAGE_URLS[1],
        "ctx_audio": AUDIO_URL,
        "ctx_video": VIDEO_URL,
        "ctx_pdf": PDF_URL,
    },
    {
        "ctx_text": "Item with JSON and valid media.",
        "ctx_number": -3.14,
        "ctx_date": "2026-07-20",
        "ctx_category": "Category Gamma",
        "ctx_code": dedent(
            """
            {
              "enabled": true,
              "score": 0.87,
              "tags": ["mock", "seed", "json"]
            }
            """
        ).strip(),
        "ctx_image": IMAGE_URLS[2],
        "ctx_audio": AUDIO_URL,
        "ctx_video": VIDEO_URL,
        "ctx_pdf": PDF_URL,
    },
    {
        "ctx_text": "Item with a Python snippet.",
        "ctx_number": 2048,
        "ctx_date": "2026-08-01",
        "ctx_category": "Category Delta",
        "ctx_code": dedent(
            """
            def normalize(value: str) -> str:
                return value.strip().lower()

            print(normalize(" Test "))
            """
        ).strip(),
        "ctx_image": IMAGE_URLS[3],
        "ctx_audio": AUDIO_URL,
        "ctx_video": VIDEO_URL,
        "ctx_pdf": PDF_URL,
    },
    {
        "ctx_text": "Item with a YouTube URL to test video embed.",
        "ctx_number": 0,
        "ctx_date": "2026-09-15",
        "ctx_category": "Category Epsilon",
        "ctx_code": dedent(
            """
            curl -X POST https://api.example.test/items \
              -H 'Content-Type: application/json' \
              -d '{"status":"ok"}'
            """
        ).strip(),
        "ctx_image": IMAGE_URLS[4],
        "ctx_audio": AUDIO_URL,
        "ctx_video": YOUTUBE_URL,
        "ctx_pdf": PDF_URL,
    },
    {
        "ctx_text": "Pending item for manual testing after running the seed.",
        "ctx_number": 777,
        "ctx_date": "2026-10-31",
        "ctx_category": "Category Zeta",
        "ctx_code": dedent(
            """
            const result = items
              .filter((item) => item.active)
              .map((item) => item.id);
            """
        ).strip(),
        "ctx_image": IMAGE_URLS[5],
        "ctx_audio": AUDIO_URL,
        "ctx_video": VIDEO_URL,
        "ctx_pdf": PDF_URL,
    },
]

DEMO_ANNOTATORS = [
    {
        "email": "context.question.annotator1@annotaise.local",
        "username": "context_question_annotator1",
        "first_name": "Test",
        "last_name": "Annotator 1",
    },
    {
        "email": "context.question.annotator2@annotaise.local",
        "username": "context_question_annotator2",
        "first_name": "Test",
        "last_name": "Annotator 2",
    },
    {
        "email": "context.question.annotator3@annotaise.local",
        "username": "context_question_annotator3",
        "first_name": "Test",
        "last_name": "Annotator 3",
    },
]


class Command(BaseCommand):
    help = (
        "Creates a context-question test seed with every context type, question "
        "type, follow-ups, and about 15 answers."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--admin-email",
            type=str,
            help="Administrator email that will own the generated test project/labeling.",
        )
        parser.add_argument(
            "--no-input",
            action="store_true",
            help="Do not prompt in the terminal. Requires --admin-email.",
        )

    def handle(self, *args, **options):
        admin_email = self._resolve_admin_email(
            admin_email=options.get("admin_email"),
            no_input=options.get("no_input", False),
        )
        admin_user = self._get_admin_user(admin_email)

        with transaction.atomic():
            project = self._upsert_project(admin_user)
            self._ensure_project_membership(project, admin_user, ProjectMembership.RoleChoices.OWNER)

            annotators = self._upsert_demo_annotators()
            for annotator in annotators:
                self._ensure_project_membership(project, annotator, ProjectMembership.RoleChoices.VIEWER)

            labeling = self._upsert_labeling(project, admin_user)
            self._ensure_labeling_membership(labeling, admin_user, LabelingMembership.Role.OWNER)
            for annotator in annotators:
                self._ensure_labeling_membership(labeling, annotator, LabelingMembership.Role.ANNOTATOR)

            self._replace_structure(labeling)
            items_count = self._replace_items(labeling)
            background_count = self._seed_background_answers(labeling, [admin_user, *annotators])
            answers_count = self._seed_demo_answers(labeling, annotators)

        self.stdout.write(
            self.style.SUCCESS(
                "Context-question test seed completed successfully:\n"
                f"- Project: {project.name} (id={project.id})\n"
                f"- Labeling: {labeling.title} (id={labeling.id})\n"
                f"- Created items: {items_count}\n"
                f"- Prefilled backgrounds: {background_count}\n"
                f"- Prefilled main answers: {answers_count}\n"
                f"- Owner/admin: {admin_user.email}\n"
                "- Command: python manage.py seed_context_question_test "
                f"--admin-email {admin_user.email} --no-input"
            )
        )

    def _resolve_admin_email(self, admin_email: str | None, no_input: bool) -> str:
        if admin_email:
            normalized = admin_email.strip().lower()
            if normalized:
                return normalized

        if no_input:
            raise CommandError("Provide --admin-email when using --no-input.")

        typed = input("Enter the administrator email that should own the seed: ").strip().lower()
        if not typed:
            raise CommandError("Administrator email cannot be empty.")
        return typed

    def _get_admin_user(self, email: str):
        user_model = get_user_model()
        user = user_model.objects.filter(email__iexact=email).first()
        if user is None:
            raise CommandError(f"No user found with email '{email}'.")
        if user.account_type != "admin" and not user.is_superuser:
            raise CommandError(f"User '{email}' exists, but is not an administrator.")
        return user

    def _upsert_demo_annotators(self) -> list[Any]:
        user_model = get_user_model()
        annotators = []

        for data in DEMO_ANNOTATORS:
            user = user_model.objects.filter(email__iexact=data["email"]).first()
            if user is None:
                user = user_model(
                    email=data["email"],
                    username=data["username"],
                    first_name=data["first_name"],
                    last_name=data["last_name"],
                    account_type="standard",
                    onboarding_status="active",
                    is_active=True,
                )
                user.set_unusable_password()
                user.save()
            else:
                fields_to_update: list[str] = []
                for field in ("first_name", "last_name"):
                    value = data[field]
                    if getattr(user, field) != value:
                        setattr(user, field, value)
                        fields_to_update.append(field)
                if user.account_type != "standard":
                    user.account_type = "standard"
                    fields_to_update.append("account_type")
                if user.onboarding_status != "active":
                    user.onboarding_status = "active"
                    fields_to_update.append("onboarding_status")
                if fields_to_update:
                    user.save(update_fields=fields_to_update)

            annotators.append(user)

        return annotators

    def _upsert_project(self, admin_user):
        project = (
            Project.objects.filter(created_by=admin_user, name__icontains="Context Question")
            .order_by("id")
            .first()
        )
        if project is None:
            project = Project.objects.create(
                name=PROJECT_NAME,
                created_by=admin_user,
                description=PROJECT_DESCRIPTION,
                status="active",
            )
            return project

        fields_to_update: list[str] = []
        if project.name != PROJECT_NAME:
            project.name = PROJECT_NAME
            fields_to_update.append("name")
        if project.description != PROJECT_DESCRIPTION:
            project.description = PROJECT_DESCRIPTION
            fields_to_update.append("description")
        if project.status != "active":
            project.status = "active"
            fields_to_update.append("status")
        if fields_to_update:
            project.save(update_fields=fields_to_update)
        return project

    def _ensure_project_membership(self, project: Project, user, role: str):
        membership, _ = ProjectMembership.objects.get_or_create(
            project=project,
            user=user,
            defaults={"role": role},
        )
        if membership.role != role:
            membership.role = role
            membership.save(update_fields=["role"])

    def _upsert_labeling(self, project: Project, admin_user):
        today = timezone.now().date()
        final_date = today + timedelta(days=90)
        labeling = (
            Labeling.objects.filter(project=project, title=LABELING_TITLE)
            .order_by("id")
            .first()
        )
        if labeling is None:
            labeling = (
                Labeling.objects.filter(project=project, guide__contains="context-question")
                .order_by("id")
                .first()
            )

        desired_values = {
            "title": LABELING_TITLE,
            "created_by": admin_user,
            "start_date": today,
            "final_date": final_date,
            "description": "Seed for testing every context-question module.",
            "decision": True,
            "decision_mode": Labeling.DecisionMode.MANUAL,
            "distribution_strategy": Labeling.DistributionStrategy.AUTO,
            "guide": LABELING_GUIDE_MARKDOWN,
            "users_per_item": 3,
            "block_section_back": True,
            "has_background_form": True,
            "column_names": COLUMN_NAMES,
            "status": Labeling.Status.ACTIVE,
            "decisive_question": None,
        }

        if labeling is None:
            return Labeling.objects.create(project=project, **desired_values)

        fields_to_update = []
        for field, value in desired_values.items():
            if getattr(labeling, field) != value:
                setattr(labeling, field, value)
                fields_to_update.append(field)
        if fields_to_update:
            labeling.save(update_fields=fields_to_update)
        return labeling

    def _ensure_labeling_membership(self, labeling: Labeling, user, role: str):
        membership, _ = LabelingMembership.objects.get_or_create(
            labeling=labeling,
            user=user,
            defaults={"role": role},
        )
        fields_to_update = []
        if membership.role != role:
            membership.role = role
            fields_to_update.append("role")
        if role != LabelingMembership.Role.ANNOTATOR and membership.items_done != 0:
            membership.items_done = 0
            fields_to_update.append("items_done")
        if fields_to_update:
            membership.save(update_fields=fields_to_update)

    def _replace_structure(self, labeling: Labeling):
        labeling.decisive_question = None
        labeling.save(update_fields=["decisive_question"])
        LabelingSection.objects.filter(labeling=labeling).delete()

        self._follow_up_order = 10000
        self._create_background_section(labeling)
        self._create_context_section(labeling)
        self._create_question_section(labeling)
        decision_question = self._create_follow_up_section(labeling)

        labeling.decisive_question = decision_question
        labeling.save(update_fields=["decisive_question"])

    def _create_background_section(self, labeling: Labeling):
        section = LabelingSection.objects.create(
            labeling=labeling,
            form_type=LabelingSection.FormType.BACKGROUND,
            title="Test background",
            order=1,
        )

        self._create_text_question(
            section=section,
            order=1,
            text="Describe your profile for this test",
            required=True,
        )
        self._create_number_question(
            section=section,
            order=2,
            text="Years of QA experience",
            required=True,
            start=0,
            end=40,
        )
        self._create_range_question(
            section=section,
            order=3,
            text="Comfort evaluating multimodal content",
            required=True,
            start=0,
            end=10,
            start_label="Low",
            end_label="High",
        )
        self._create_multiple_choice_question(
            section=section,
            order=4,
            text="Which blocks do you want to review?",
            options=["Contexts", "Questions", "Follow-ups", "Summaries"],
            allow_multiple=True,
            required=True,
        )
        self._create_multiple_choice_question(
            section=section,
            order=5,
            text="Test agreement",
            options=["I agree", "I do not agree"],
            allow_multiple=False,
            required=True,
        )

    def _create_context_section(self, labeling: Labeling):
        section = LabelingSection.objects.create(
            labeling=labeling,
            form_type=LabelingSection.FormType.MAIN,
            title="1 - All context types",
            order=1,
        )

        self._create_context(section, 1, "Text context", "ctx_text", LabelingElement.ContextType.TEXT)
        self._create_context(section, 2, "Number context", "ctx_number", LabelingElement.ContextType.NUMBER)
        self._create_context(section, 3, "Date context", "ctx_date", LabelingElement.ContextType.DATE)
        self._create_context(section, 4, "Category context", "ctx_category", LabelingElement.ContextType.CATEGORY)
        self._create_context(section, 5, "Code context", "ctx_code", LabelingElement.ContextType.CODE)
        self._create_context(section, 6, "Image context", "ctx_image", LabelingElement.ContextType.IMAGE)
        self._create_context(section, 7, "Audio context", "ctx_audio", LabelingElement.ContextType.AUDIO)
        self._create_context(section, 8, "Video context", "ctx_video", LabelingElement.ContextType.VIDEO)
        self._create_context(section, 9, "PDF context", "ctx_pdf", LabelingElement.ContextType.PDF)

    def _create_question_section(self, labeling: Labeling):
        section = LabelingSection.objects.create(
            labeling=labeling,
            form_type=LabelingSection.FormType.MAIN,
            title="2 - Basic questions",
            order=2,
        )

        self._create_text_question(
            section=section,
            order=1,
            text="Free-form item summary",
            required=True,
        )
        self._create_number_question(
            section=section,
            order=2,
            text="Numeric score with minimum and maximum",
            required=True,
            start=0,
            end=100,
        )
        self._create_number_question(
            section=section,
            order=3,
            text="Optional number with minimum only",
            required=False,
            start=10,
            end=None,
        )
        self._create_range_question(
            section=section,
            order=4,
            text="Linear scale from 0 to 10 with labels",
            required=True,
            start=0,
            end=10,
            start_label="Poor",
            end_label="Excellent",
        )
        self._create_multiple_choice_question(
            section=section,
            order=5,
            text="Single multiple-choice question",
            options=["Alpha", "Beta", "Gamma"],
            allow_multiple=False,
            required=True,
        )
        self._create_multiple_choice_question(
            section=section,
            order=6,
            text="Multiple-answer choice question",
            options=["Text ok", "Number ok", "Media plays", "Code ok", "PDF opens"],
            allow_multiple=True,
            required=True,
        )

    def _create_follow_up_section(self, labeling: Labeling) -> LabelingElement:
        section = LabelingSection.objects.create(
            labeling=labeling,
            form_type=LabelingSection.FormType.MAIN,
            title="3 - Follow-ups and decision",
            order=3,
        )

        decision_question = self._create_multiple_choice_question(
            section=section,
            order=1,
            text="Final item decision",
            options=["Approve", "Reject", "Review"],
            allow_multiple=False,
            required=True,
        )
        self._create_multiple_choice_question(
            section=section,
            order=2,
            text="Single choice with text follow-up",
            options=["All good", "Needs adjustment", "Blocked"],
            allow_multiple=False,
            required=True,
            follow_ups={
                "Needs adjustment": {
                    "question_type": LabelingElement.QuestionType.TEXT,
                    "text": "Briefly explain the required adjustment",
                    "required": True,
                },
                "Blocked": {
                    "question_type": LabelingElement.QuestionType.TEXT,
                    "text": "Explain why it was blocked",
                    "required": True,
                },
            },
        )
        self._create_multiple_choice_question(
            section=section,
            order=3,
            text="Multiple-answer choice with all follow-up types",
            options=[
                "Ask for number",
                "Ask for scale",
                "Ask for choice",
                "Ask for text",
                "No follow-up",
            ],
            allow_multiple=True,
            required=True,
            follow_ups={
                "Ask for number": {
                    "question_type": LabelingElement.QuestionType.NUMBER,
                    "text": "Enter a complementary number",
                    "required": True,
                    "start": 0,
                    "end": 999,
                },
                "Ask for scale": {
                    "question_type": LabelingElement.QuestionType.RANGE,
                    "text": "Rate the complementary intensity",
                    "required": True,
                    "start": 1,
                    "end": 5,
                    "start_label": "Low",
                    "end_label": "High",
                },
                "Ask for choice": {
                    "question_type": LabelingElement.QuestionType.MULTIPLE_CHOICE,
                    "text": "Choose complementary options",
                    "required": True,
                    "options": ["Alpha FU", "Beta FU", "Gamma FU"],
                    "allow_multiple": True,
                },
                "Ask for text": {
                    "question_type": LabelingElement.QuestionType.TEXT,
                    "text": "Describe the complement in text",
                    "required": True,
                },
            },
        )
        return decision_question

    def _create_context(
        self,
        section: LabelingSection,
        order: int,
        text: str,
        column_name: str,
        context_type: str,
    ) -> LabelingElement:
        return LabelingElement.objects.create(
            labeling_section=section,
            order=order,
            text=text,
            required=False,
            question_type=LabelingElement.QuestionType.CONTEXT,
            column_name=column_name,
            context_type=context_type,
            allow_multiple=False,
        )

    def _create_text_question(
        self,
        *,
        section: LabelingSection,
        order: int,
        text: str,
        required: bool,
    ) -> LabelingElement:
        return LabelingElement.objects.create(
            labeling_section=section,
            order=order,
            text=text,
            required=required,
            question_type=LabelingElement.QuestionType.TEXT,
            allow_multiple=False,
        )

    def _create_number_question(
        self,
        *,
        section: LabelingSection,
        order: int,
        text: str,
        required: bool,
        start: float | None = None,
        end: float | None = None,
    ) -> LabelingElement:
        element = LabelingElement.objects.create(
            labeling_section=section,
            order=order,
            text=text,
            required=required,
            question_type=LabelingElement.QuestionType.NUMBER,
            allow_multiple=False,
        )
        if start is not None or end is not None:
            QuestionRange.objects.create(labeling_element=element, start=start, end=end)
        return element

    def _create_range_question(
        self,
        *,
        section: LabelingSection,
        order: int,
        text: str,
        required: bool,
        start: float,
        end: float,
        start_label: str = "",
        end_label: str = "",
    ) -> LabelingElement:
        element = LabelingElement.objects.create(
            labeling_section=section,
            order=order,
            text=text,
            required=required,
            question_type=LabelingElement.QuestionType.RANGE,
            allow_multiple=False,
        )
        QuestionRange.objects.create(
            labeling_element=element,
            start=start,
            end=end,
            start_label=start_label,
            end_label=end_label,
        )
        return element

    def _create_multiple_choice_question(
        self,
        *,
        section: LabelingSection,
        order: int,
        text: str,
        options: list[str],
        allow_multiple: bool,
        required: bool,
        follow_ups: dict[str, dict[str, Any]] | None = None,
    ) -> LabelingElement:
        element = LabelingElement.objects.create(
            labeling_section=section,
            order=order,
            text=text,
            required=required,
            question_type=LabelingElement.QuestionType.MULTIPLE_CHOICE,
            allow_multiple=allow_multiple,
        )

        for idx, option in enumerate(options, start=1):
            follow_up_element = None
            if follow_ups and option in follow_ups:
                follow_up_element = self._create_follow_up_question(
                    section=section,
                    spec=follow_ups[option],
                )
            MultipleChoiceItem.objects.create(
                labeling_element=element,
                text=option,
                value=False,
                order=idx,
                follow_up_question=follow_up_element,
            )

        return element

    def _create_follow_up_question(
        self,
        *,
        section: LabelingSection,
        spec: dict[str, Any],
    ) -> LabelingElement:
        question_type = spec["question_type"]
        order = self._next_follow_up_order()
        element = LabelingElement.objects.create(
            labeling_section=section,
            order=order,
            text=spec.get("text", ""),
            required=spec.get("required", False),
            question_type=question_type,
            allow_multiple=spec.get("allow_multiple", False),
        )

        if question_type == LabelingElement.QuestionType.NUMBER:
            start = spec.get("start")
            end = spec.get("end")
            if start is not None or end is not None:
                QuestionRange.objects.create(labeling_element=element, start=start, end=end)
            return element

        if question_type == LabelingElement.QuestionType.RANGE:
            QuestionRange.objects.create(
                labeling_element=element,
                start=spec.get("start", 1),
                end=spec.get("end", 5),
                start_label=spec.get("start_label", ""),
                end_label=spec.get("end_label", ""),
            )
            return element

        if question_type == LabelingElement.QuestionType.MULTIPLE_CHOICE:
            for idx, option in enumerate(spec.get("options", []), start=1):
                MultipleChoiceItem.objects.create(
                    labeling_element=element,
                    text=option,
                    value=False,
                    order=idx,
                )

        return element

    def _next_follow_up_order(self) -> int:
        self._follow_up_order += 1
        return self._follow_up_order

    def _replace_items(self, labeling: Labeling) -> int:
        BackgroundAnswer.objects.filter(labeling=labeling).delete()
        Answer.objects.filter(labeling=labeling).delete()
        Item.objects.filter(labeling=labeling).delete()

        items_to_create = []
        for index, row in enumerate(SAMPLE_ROWS):
            payload = {column_name: row[column_name] for column_name in COLUMN_NAMES}
            items_to_create.append(
                Item(
                    labeling=labeling,
                    payload=payload,
                    row_index=index,
                    status="pending",
                )
            )
        Item.objects.bulk_create(items_to_create)
        return len(items_to_create)

    def _seed_background_answers(self, labeling: Labeling, users: list[Any]) -> int:
        questions = self._main_questions_by_text(labeling, form_type=LabelingSection.FormType.BACKGROUND)
        payloads = []

        for index, user in enumerate(users):
            payload = {
                str(questions["Describe your profile for this test"].id): (
                    f"Seeded profile for {user.email}"
                ),
                str(questions["Years of QA experience"].id): 2 + index,
                str(questions["Comfort evaluating multimodal content"].id): min(10, 6 + index),
                str(questions["Which blocks do you want to review?"].id): [
                    "Contexts",
                    "Questions",
                    "Follow-ups",
                    "Summaries",
                ],
                str(questions["Test agreement"].id): "I agree",
            }
            payloads.append(
                BackgroundAnswer(
                    labeling=labeling,
                    answered_by=user,
                    answer_payload=payload,
                )
            )

        BackgroundAnswer.objects.bulk_create(payloads)
        return len(payloads)

    def _seed_demo_answers(self, labeling: Labeling, annotators: list[Any]) -> int:
        questions = self._main_questions_by_text(labeling, form_type=LabelingSection.FormType.MAIN)
        finished_items = list(Item.objects.filter(labeling=labeling).order_by("row_index")[:5])

        if len(finished_items) != 5:
            raise CommandError("The seed expected at least 5 items to prefill answers.")

        decisions = [
            ["Approve", "Approve", "Review"],
            ["Reject", "Reject", "Review"],
            ["Review", "Approve", "Review"],
            ["Approve", "Review", "Approve"],
            ["Reject", "Reject", "Approve"],
        ]
        simple_choices = ["Alpha", "Beta", "Gamma"]
        single_follow_up_choices = ["All good", "Needs adjustment", "Blocked"]
        multi_base = [
            ["Text ok", "Number ok", "Media plays"],
            ["Text ok", "Code ok", "PDF opens"],
            ["Number ok", "Media plays", "PDF opens"],
        ]
        multi_follow_up = [
            ["Ask for number", "Ask for scale", "Ask for choice", "Ask for text"],
            ["Ask for number", "Ask for choice", "No follow-up"],
            ["Ask for scale", "Ask for text", "No follow-up"],
        ]

        answer_objects = []
        for item_index, item in enumerate(finished_items):
            decision_payload: dict[str, int] = {}

            for annotator_index, annotator in enumerate(annotators):
                decision = decisions[item_index][annotator_index]
                decision_payload[decision] = decision_payload.get(decision, 0) + 1
                single_follow_choice = single_follow_up_choices[(item_index + annotator_index) % len(single_follow_up_choices)]
                selected_multi_follow = multi_follow_up[annotator_index]

                payload: dict[str, Any] = {
                    str(questions["Free-form item summary"].id): (
                        f"Answer {annotator_index + 1} for item {item_index + 1}: "
                        "mock text for summary."
                    ),
                    str(questions["Numeric score with minimum and maximum"].id): 20 + item_index * 12 + annotator_index * 7,
                    str(questions["Optional number with minimum only"].id): (
                        "" if (item_index + annotator_index) % 3 == 0 else 10 + item_index + annotator_index
                    ),
                    str(questions["Linear scale from 0 to 10 with labels"].id): (item_index + annotator_index) % 11,
                    str(questions["Single multiple-choice question"].id): simple_choices[(item_index + annotator_index) % len(simple_choices)],
                    str(questions["Multiple-answer choice question"].id): [
                        *multi_base[annotator_index],
                        *(
                            ["Option outside the seeded list"]
                            if item_index == 4 and annotator_index == 2
                            else []
                        ),
                    ],
                    str(questions["Final item decision"].id): decision,
                    str(questions["Single choice with text follow-up"].id): single_follow_choice,
                    str(questions["Multiple-answer choice with all follow-up types"].id): selected_multi_follow,
                }

                self._add_single_follow_up_payload(
                    payload=payload,
                    parent=questions["Single choice with text follow-up"],
                    selected=single_follow_choice,
                    item_index=item_index,
                    annotator_index=annotator_index,
                )
                self._add_multi_follow_up_payload(
                    payload=payload,
                    parent=questions["Multiple-answer choice with all follow-up types"],
                    selected=selected_multi_follow,
                    item_index=item_index,
                    annotator_index=annotator_index,
                )

                answer_objects.append(
                    Answer(
                        labeling=labeling,
                        item=item,
                        answered_by=annotator,
                        answer_payload=payload,
                    )
                )

            item.status = "finished"
            item.decision_payload = decision_payload
            item.final_decision_source = "human"
            item.final_decision_value = max(decision_payload.items(), key=lambda entry: entry[1])[0]
            item.save(
                update_fields=[
                    "status",
                    "decision_payload",
                    "final_decision_source",
                    "final_decision_value",
                ]
            )

        Answer.objects.bulk_create(answer_objects)

        for annotator in annotators:
            membership = LabelingMembership.objects.filter(labeling=labeling, user=annotator).first()
            if membership and membership.items_done != len(finished_items):
                membership.items_done = len(finished_items)
                membership.save(update_fields=["items_done"])

        labeling.status = Labeling.Status.ACTIVE
        labeling.save(update_fields=["status"])

        return len(answer_objects)

    def _add_single_follow_up_payload(
        self,
        *,
        payload: dict[str, Any],
        parent: LabelingElement,
        selected: str,
        item_index: int,
        annotator_index: int,
    ):
        if selected not in {"Needs adjustment", "Blocked"}:
            return
        payload[self._follow_up_key(parent, selected)] = (
            f"Text follow-up for {selected.lower()} on item {item_index + 1}, "
            f"user {annotator_index + 1}."
        )

    def _add_multi_follow_up_payload(
        self,
        *,
        payload: dict[str, Any],
        parent: LabelingElement,
        selected: list[str],
        item_index: int,
        annotator_index: int,
    ):
        if "Ask for number" in selected:
            payload[self._follow_up_key(parent, "Ask for number")] = 100 + item_index * 10 + annotator_index
        if "Ask for scale" in selected:
            payload[self._follow_up_key(parent, "Ask for scale")] = 1 + ((item_index + annotator_index) % 5)
        if "Ask for choice" in selected:
            payload[self._follow_up_key(parent, "Ask for choice")] = (
                ["Alpha FU", "Gamma FU"] if annotator_index % 2 == 0 else ["Beta FU"]
            )
        if "Ask for text" in selected:
            payload[self._follow_up_key(parent, "Ask for text")] = (
                f"Text complement for item {item_index + 1}, user {annotator_index + 1}."
            )

    def _follow_up_key(self, parent: LabelingElement, option_text: str) -> str:
        item = parent.multiple_choice_items.get(text=option_text)
        return f"followup_{parent.id}_{item.id}"

    def _main_questions_by_text(self, labeling: Labeling, form_type: str) -> dict[str, LabelingElement]:
        questions = (
            LabelingElement.objects.filter(
                labeling_section__labeling=labeling,
                labeling_section__form_type=form_type,
            )
            .exclude(question_type=LabelingElement.QuestionType.CONTEXT)
            .order_by("labeling_section__order", "order")
        )
        return {question.text: question for question in questions}
