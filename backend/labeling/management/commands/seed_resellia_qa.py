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


PROJECT_NAME = "ReSellia QA"
LABELING_TITLE = "Multimodal Listing Verification (v1)"

PROJECT_DESCRIPTION = (
    "Marketplace listing enrichment and QA to reduce fraud/mismatch and improve "
    "search/ranking."
)

LABELING_GUIDE_MARKDOWN = dedent(
    """
    # ReSellia QA - Labeling Guide (v1)

    ## Goal
    You will help measure **quality and trustworthiness** in marketplace listings.

    ## Quick rules
    - Use only what appears in the tool.
    - Do not search externally and do not guess.
    - If evidence is missing, mark that.

    ## Flow
    1) Background
    2) Session 1 - First impression (text)
    3) Session 2 - Evidence review (photos + technical specs + chat)

    After moving forward, you cannot go back.

    ## What to evaluate
    **Session 1**
    - Price perception (from very expensive to very cheap)
    - Signals in the text
    - Risk on a linear scale
    - What is missing to trust the listing

    **Session 2**
    - Price perception again
    - Whether the evidence supports the listing
    - Visual alerts
    - Overall condition on a linear scale and short justification

    Tip: use **Partially** when the listing seems real but lacks proof for an important point.
    """
).strip()

COLUMN_NAMES = [
    "listing_id",
    "title",
    "description",
    "price_brl",
    "city_state",
    "technical_specs",
    "chat_excerpt",
    "image_main_url",
    "image_detail_url",
]

PRICE_PERCEPTION_OPTIONS = [
    "Very expensive",
    "Expensive",
    "Fair",
    "Cheap",
    "Very cheap",
]

SAMPLE_ROWS: list[dict[str, Any]] = [
    {
        "listing_id": "RS_0001",
        "title": "Nintendo Switch v2 + dock + Joy-Cons (no drift)",
        "description": (
            "Console used at home. Includes dock, 2 Joy-Cons, HDMI cable, and power adapter. "
            "No box and no invoice. Tested, works fine. Local pickup only."
        ),
        "price_brl": 1550,
        "city_state": "Sao Paulo-SP",
        "technical_specs": dedent(
            """
            **Model:** `HAC-001(-01)`
            **Storage:** 32GB
            **Includes:**
            - Console
            - Dock
            - 2 Joy-Con
            - Power adapter
            - HDMI

            ```txt
            Reported condition: used / tested
            Reason for sale: unused
            ```
            """
        ).strip(),
        "chat_excerpt": dedent(
            """
            **Chat:**

            **Buyer:** do you have the invoice?

            **Seller:** I don't have it, it was a gift.

            **Buyer:** do you accept marketplace shipping?

            **Seller:** pickup only.
            """
        ).strip(),
        "image_main_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Nintendo-Switch-Console-Docked-wJoyConRB.jpg"
        ),
        "image_detail_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Nintendo-Switch-Console-Bare-BR.jpg"
        ),
    },
    {
        "listing_id": "RS_0002",
        "title": 'MacBook Pro 13" 2019 Touch Bar 16GB/512GB',
        "description": (
            "Well-kept notebook, battery still holds well. Screen is ok. Includes charger. "
            "No box. Formatted and ready to use."
        ),
        "price_brl": 4200,
        "city_state": "Curitiba-PR",
        "technical_specs": dedent(
            """
            **Model:** MacBook Pro 13" (2019)
            **CPU/RAM/SSD:** `i5 / 16GB / 512GB`
            **Battery:** `cycles ~ 320`
            **Includes:** charger

            - No signs of drops
            - PT/US keyboard to confirm in the photo
            """
        ).strip(),
        "chat_excerpt": dedent(
            """
            **Chat:**

            **Buyer:** any keyboard issue?

            **Seller:** never had a problem, always used a cover.

            **Buyer:** can you send a photo of the serial?

            **Seller:** I prefer not to expose it here.
            """
        ).strip(),
        "image_main_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "MacBook_Pro_2019_13_inch.jpg"
        ),
        "image_detail_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Macbook_Pro_Keyboard_(US_Layout).jpg"
        ),
    },
    {
        "listing_id": "RS_0003",
        "title": "Adidas Stan Smith pair size 41 - lightly used",
        "description": (
            "Used a few times, then stored. No tears. Sole is good. Delivered clean."
        ),
        "price_brl": 280,
        "city_state": "Belo Horizonte-MG",
        "technical_specs": dedent(
            """
            **Size:** `41 BR`
            **Color:** white/green
            **Reported condition:** lightly used

            Checklist:
            - stitching ok
            - sole not detached
            """
        ).strip(),
        "chat_excerpt": dedent(
            """
            **Chat:**

            **Buyer:** does it come with the box?

            **Seller:** no, just the pair.

            **Buyer:** can you send a photo of the sole?

            **Seller:** it is in the photos, it is fine.
            """
        ).strip(),
        "image_main_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Adidas_Stan_Smith_wht-blk.jpg"
        ),
        "image_detail_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Adidas_Stan_Smith_(made_in_France).jpg"
        ),
    },
    {
        "listing_id": "RS_0004",
        "title": "Road bike frame 54 ready to ride",
        "description": (
            "Light road bike, good for training. Handlebar tape was replaced recently. "
            "Needs a simple derailleur tune-up. No trades."
        ),
        "price_brl": 3500,
        "city_state": "Florianopolis-SC",
        "technical_specs": dedent(
            """
            **Type:** road bike
            **Frame:** `54` (reported)
            **Notes:**
            - derailleur tune-up needed
            - new handlebar tape

            ```txt
            Accessories: no pedals
            ```
            """
        ).strip(),
        "chat_excerpt": dedent(
            """
            **Chat:**

            **Buyer:** which groupset? Which Shimano?

            **Seller:** I do not know, I bought it like this.

            **Buyer:** do you have invoice or frame number?

            **Seller:** I never checked that.
            """
        ).strip(),
        "image_main_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Specialized_road_bike.JPG"
        ),
        "image_detail_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/Bicycle_road.jpg"
        ),
    },
    {
        "listing_id": "RS_0005",
        "title": "Canon DSLR camera + 50mm lens (read)",
        "description": (
            "Camera works. Includes 50mm lens and cap. No memory card included. "
            "Selling because I moved to mirrorless."
        ),
        "price_brl": 1900,
        "city_state": "Recife-PE",
        "technical_specs": dedent(
            """
            **Brand:** Canon (reported)
            **Type:** DSLR
            **Includes:**
            - body
            - lente `50mm`
            - cap

            Note: no card / no bag
            """
        ).strip(),
        "chat_excerpt": dedent(
            """
            **Chat:**

            **Buyer:** how many shutter clicks?

            **Seller:** I do not know.

            **Buyer:** is there fungus in the lens?

            **Seller:** I never noticed.
            """
        ).strip(),
        "image_main_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Canon_Camera_(Unsplash).jpg"
        ),
        "image_detail_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "DSLR_Camera_with_Lens_on_a_Tripod_head.jpg"
        ),
    },
    {
        "listing_id": "RS_0006",
        "title": "Acoustic guitar - great for practice",
        "description": (
            "Good beginner guitar, sound is ok. Has normal signs of use. "
            "Strings were replaced 2 months ago."
        ),
        "price_brl": 450,
        "city_state": "Porto Alegre-RS",
        "technical_specs": dedent(
            """
            **Type:** acoustic guitar
            **Use:** practice
            **Reported condition:** normal marks

            - strings replaced ~2 months ago
            - no case
            """
        ).strip(),
        "chat_excerpt": dedent(
            """
            **Chat:**

            **Buyer:** does it buzz?

            **Seller:** no, just standard action.

            **Buyer:** any cracks?

            **Seller:** I did not see anything.
            """
        ).strip(),
        "image_main_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/Acoustic_Guitar.jpg"
        ),
        "image_detail_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Close-up_Acoustic_Guitar.jpg"
        ),
    },
]


class Command(BaseCommand):
    help = (
        "Creates the ReSellia QA seed with project, labeling, background, form "
        "sessions, and items."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--admin-email",
            type=str,
            help=(
                "Administrator email that will own the generated project/labeling."
            ),
        )
        parser.add_argument(
            "--no-input",
            action="store_true",
            help=(
                "Do not prompt in the terminal. Requires --admin-email for "
                "non-interactive execution."
            ),
        )

    def handle(self, *args, **options):
        admin_email = self._resolve_admin_email(
            admin_email=options.get("admin_email"),
            no_input=options.get("no_input", False),
        )
        admin_user = self._get_admin_user(admin_email)

        with transaction.atomic():
            project = self._upsert_project(admin_user)
            self._ensure_project_membership(project, admin_user)
            labeling = self._upsert_labeling(project, admin_user)
            self._ensure_labeling_membership(labeling, admin_user)
            self._replace_structure(labeling)
            items_count = self._replace_items(labeling)
            prefilled_answers = self._seed_creator_answers(labeling, admin_user)

        self.stdout.write(
            self.style.SUCCESS(
                "ReSellia QA seed completed successfully:\n"
                f"- Project: {project.name} (id={project.id})\n"
                f"- Labeling: {labeling.title} (id={labeling.id})\n"
                f"- Loaded items: {items_count}\n"
                f"- Creator prefilled items: {prefilled_answers}\n"
                f"- Creator assigned to: {admin_user.email}"
            )
        )

    def _resolve_admin_email(self, admin_email: str | None, no_input: bool) -> str:
        if admin_email:
            normalized = admin_email.strip().lower()
            if normalized:
                return normalized

        if no_input:
            raise CommandError(
                "Provide --admin-email when using --no-input."
            )

        typed = input(
            "Enter the administrator email that should own the seed: "
        ).strip().lower()
        if not typed:
            raise CommandError("Administrator email cannot be empty.")
        return typed

    def _get_admin_user(self, email: str):
        user_model = get_user_model()
        user = user_model.objects.filter(email__iexact=email).first()
        if user is None:
            raise CommandError(
                f"No user found with email '{email}'."
            )
        if user.account_type != "admin" and not user.is_superuser:
            raise CommandError(
                f"User '{email}' exists, but is not an administrator."
            )
        return user

    def _upsert_project(self, admin_user):
        project, _ = Project.objects.get_or_create(
            name=PROJECT_NAME,
            created_by=admin_user,
            defaults={
                "description": PROJECT_DESCRIPTION,
                "status": "active",
            },
        )

        fields_to_update: list[str] = []
        if project.description != PROJECT_DESCRIPTION:
            project.description = PROJECT_DESCRIPTION
            fields_to_update.append("description")
        if project.status != "active":
            project.status = "active"
            fields_to_update.append("status")
        if fields_to_update:
            project.save(update_fields=fields_to_update)
        return project

    def _ensure_project_membership(self, project: Project, admin_user):
        membership, _ = ProjectMembership.objects.get_or_create(
            project=project,
            user=admin_user,
            defaults={"role": ProjectMembership.RoleChoices.OWNER},
        )
        if membership.role != ProjectMembership.RoleChoices.OWNER:
            membership.role = ProjectMembership.RoleChoices.OWNER
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
                Labeling.objects.filter(project=project, guide__contains="ReSellia QA")
                .order_by("id")
                .first()
            )

        if labeling is None:
            labeling = Labeling.objects.create(
                project=project,
                created_by=admin_user,
                title=LABELING_TITLE,
                start_date=today,
                final_date=final_date,
                decision=True,
                guide=LABELING_GUIDE_MARKDOWN,
                users_per_item=1,
                block_section_back=True,
                has_background_form=True,
                column_names=COLUMN_NAMES,
                status=Labeling.Status.ACTIVE,
            )
            return labeling

        fields_to_update: list[str] = []
        desired_values = {
            "created_by": admin_user,
            "title": LABELING_TITLE,
            "start_date": today,
            "final_date": final_date,
            "decision": True,
            "guide": LABELING_GUIDE_MARKDOWN,
            "users_per_item": 1,
            "block_section_back": True,
            "has_background_form": True,
            "column_names": COLUMN_NAMES,
            "status": Labeling.Status.ACTIVE,
        }

        for field, value in desired_values.items():
            if getattr(labeling, field) != value:
                setattr(labeling, field, value)
                fields_to_update.append(field)

        if fields_to_update:
            labeling.save(update_fields=fields_to_update)

        return labeling

    def _ensure_labeling_membership(self, labeling: Labeling, admin_user):
        membership, _ = LabelingMembership.objects.get_or_create(
            labeling=labeling,
            user=admin_user,
            defaults={"role": LabelingMembership.Role.OWNER},
        )
        if membership.role != LabelingMembership.Role.OWNER:
            membership.role = LabelingMembership.Role.OWNER
            membership.save(update_fields=["role"])

    def _replace_structure(self, labeling: Labeling):
        LabelingSection.objects.filter(labeling=labeling).delete()

        self._create_background_section(labeling)
        self._create_session_1_section(labeling)
        self._create_session_2_section(labeling)

    def _create_background_section(self, labeling: Labeling):
        section = LabelingSection.objects.create(
            labeling=labeling,
            form_type=LabelingSection.FormType.BACKGROUND,
            title="Background",
            order=1,
        )

        self._create_number_question(
            section=section,
            order=1,
            text="Age",
            required=True,
            start=0,
            end=120,
        )
        self._create_range_question(
            section=section,
            order=2,
            text="Familiarity with online buying/selling",
            start=0,
            end=10,
            required=True,
            start_label="Not familiar",
            end_label="Very familiar",
        )
        self._create_multiple_choice_question(
            section=section,
            order=3,
            text="Categories you feel comfortable evaluating",
            options=[
                "Electronics",
                "Computers",
                "Fashion (sneakers/clothing)",
                "Bikes",
                "Musical instruments",
                "Photography",
            ],
            allow_multiple=True,
            required=True,
        )
        self._create_multiple_choice_question(
            section=section,
            order=4,
            text="Commitment",
            options=[
                "I will label only with what appears here (no outside search)",
                "I do not agree",
            ],
            allow_multiple=False,
            required=True,
        )

    def _create_session_1_section(self, labeling: Labeling):
        section = LabelingSection.objects.create(
            labeling=labeling,
            form_type=LabelingSection.FormType.MAIN,
            title="1 - First impression",
            order=1,
        )

        self._create_context(
            section=section,
            order=1,
            text="Listing title",
            column_name="title",
            context_type=LabelingElement.ContextType.TEXT,
        )
        self._create_context(
            section=section,
            order=2,
            text="Listing description",
            column_name="description",
            context_type=LabelingElement.ContextType.TEXT,
        )
        self._create_context(
            section=section,
            order=3,
            text="Price (BRL)",
            column_name="price_brl",
            context_type=LabelingElement.ContextType.NUMBER,
        )
        self._create_context(
            section=section,
            order=4,
            text="Location",
            column_name="city_state",
            context_type=LabelingElement.ContextType.TEXT,
        )

        self._create_multiple_choice_question(
            section=section,
            order=5,
            text="Based on what you have seen so far, the price seems:",
            options=PRICE_PERCEPTION_OPTIONS,
            allow_multiple=False,
            required=True,
        )
        self._create_multiple_choice_question(
            section=section,
            order=6,
            text="Which signals does the text contain?",
            options=[
                "No invoice",
                "No box",
                "Accepts trade",
                "Pickup only",
                "Shipping available",
                "Lightly used",
                "Tested/working",
                "Needs maintenance",
                "Seller avoids details",
                "Other",
            ],
            allow_multiple=True,
            required=True,
        )
        self._create_number_question(
            section=section,
            order=7,
            text="How many items does the seller say are included? (0 if not stated)",
            required=True,
            start=0,
        )
        self._create_range_question(
            section=section,
            order=8,
            text="Risk that the listing is problematic based on text only",
            start=1,
            end=5,
            required=True,
            start_label="Very low",
            end_label="Very high",
        )
        self._create_text_question(
            section=section,
            order=9,
            text="What is missing for you to trust it? (1 objective sentence)",
            required=True,
        )

    def _create_session_2_section(self, labeling: Labeling):
        section = LabelingSection.objects.create(
            labeling=labeling,
            form_type=LabelingSection.FormType.MAIN,
            title="2 - Evidence review",
            order=2,
        )

        self._create_context(
            section=section,
            order=1,
            text="Main photo",
            column_name="image_main_url",
            context_type=LabelingElement.ContextType.IMAGE,
        )
        self._create_context(
            section=section,
            order=2,
            text="Detail photo",
            column_name="image_detail_url",
            context_type=LabelingElement.ContextType.IMAGE,
        )
        self._create_context(
            section=section,
            order=3,
            text="Technical specs (from seller)",
            column_name="technical_specs",
            context_type=LabelingElement.ContextType.TEXT,
        )
        self._create_context(
            section=section,
            order=4,
            text="Chat excerpt",
            column_name="chat_excerpt",
            context_type=LabelingElement.ContextType.TEXT,
        )

        self._create_multiple_choice_question(
            section=section,
            order=5,
            text="Based on what you have seen so far, the price seems:",
            options=PRICE_PERCEPTION_OPTIONS,
            allow_multiple=False,
            required=True,
        )
        self._create_multiple_choice_question(
            section=section,
            order=6,
            text="Do the photos, technical specs, and chat support what the seller claims?",
            options=["Yes", "Partially", "No", "Cannot conclude"],
            allow_multiple=False,
            required=True,
        )
        self._create_multiple_choice_question(
            section=section,
            order=7,
            text="Visual problems/alerts",
            options=[
                "Blurry/dark photo",
                "Different item across photos",
                "Strong marks (scratches/cracks)",
                "Missing parts",
                "Poor storage signs (mold/rust)",
                "Brand/model not visible",
                "None of these",
            ],
            allow_multiple=True,
            required=True,
        )
        self._create_number_question(
            section=section,
            order=8,
            text="How many physical items are clearly visible in the photos?",
            required=True,
            start=0,
            end=10,
        )
        self._create_range_question(
            section=section,
            order=9,
            text="Perceived overall condition",
            start=1,
            end=5,
            required=True,
            start_label="Very poor",
            end_label="Very good",
        )
        self._create_text_question(
            section=section,
            order=10,
            text="Short score justification (max. 200 characters)",
            required=True,
        )

    def _create_context(
        self,
        *,
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
            QuestionRange.objects.create(
                labeling_element=element,
                start=start,
                end=end,
            )
        return element

    def _create_range_question(
        self,
        *,
        section: LabelingSection,
        order: int,
        text: str,
        start: float,
        end: float,
        required: bool,
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
            MultipleChoiceItem.objects.create(
                labeling_element=element,
                text=option,
                value=False,
                order=idx,
            )
        return element

    def _replace_items(self, labeling: Labeling) -> int:
        Item.objects.filter(labeling=labeling).delete()

        items_to_create = []
        for index, row in enumerate(SAMPLE_ROWS):
            payload = {column_name: row[column_name] for column_name in COLUMN_NAMES}
            items_to_create.append(
                Item(
                    labeling=labeling,
                    payload=payload,
                    row_index=index,
                    status=Item.Status.PENDING,
                )
            )
        Item.objects.bulk_create(items_to_create)
        return len(items_to_create)

    def _seed_creator_answers(self, labeling: Labeling, admin_user) -> int:
        background_section = (
            LabelingSection.objects.filter(
                labeling=labeling,
                form_type=LabelingSection.FormType.BACKGROUND,
            )
            .order_by("order")
            .first()
        )
        if background_section:
            background_questions = list(
                background_section.elements.exclude(
                    question_type=LabelingElement.QuestionType.CONTEXT
                ).order_by("order")
            )
            background_payload: dict[str, Any] = {}

            for question in background_questions:
                question_key = str(question.id)
                question_text = (question.text or "").strip().lower()

                if question.question_type == LabelingElement.QuestionType.NUMBER:
                    background_payload[question_key] = 32
                    continue

                if question.question_type == LabelingElement.QuestionType.RANGE:
                    background_payload[question_key] = 8
                    continue

                if question.question_type == LabelingElement.QuestionType.TEXT:
                    background_payload[question_key] = "Background answer"
                    continue

                if question.question_type == LabelingElement.QuestionType.MULTIPLE_CHOICE:
                    options = list(
                        question.multiple_choice_items.order_by("order").values_list(
                            "text", flat=True
                        )
                    )
                    if not options:
                        continue

                    if question.allow_multiple:
                        preferred = ["Electronics", "Computers", "Photography"]
                        selected = [option for option in preferred if option in options]
                        background_payload[question_key] = selected or options[:2]
                        continue

                    preferred_single = "I will label only with what appears here (no outside search)"
                    if preferred_single in options:
                        background_payload[question_key] = preferred_single
                    else:
                        background_payload[question_key] = options[0]
                    continue

                if "age" in question_text:
                    background_payload[question_key] = 32
                elif "familiarity" in question_text:
                    background_payload[question_key] = 8
                else:
                    background_payload[question_key] = ""

            if background_payload:
                BackgroundAnswer.objects.update_or_create(
                    labeling=labeling,
                    answered_by=admin_user,
                    defaults={"answer_payload": background_payload},
                )

        main_sections = list(
            LabelingSection.objects.filter(
                labeling=labeling,
                form_type=LabelingSection.FormType.MAIN,
            ).order_by("order")
        )
        if len(main_sections) < 2:
            raise CommandError(
                "Could not generate sample answers: main sections are missing."
            )

        session_1_questions = list(
            main_sections[0].elements.exclude(
                question_type=LabelingElement.QuestionType.CONTEXT
            ).order_by("order")
        )
        session_2_questions = list(
            main_sections[1].elements.exclude(
                question_type=LabelingElement.QuestionType.CONTEXT
            ).order_by("order")
        )
        if len(session_1_questions) != 5 or len(session_2_questions) != 6:
            raise CommandError(
                "Could not generate sample answers: labeling structure is not as expected."
            )

        question_ids = {
            "s1_price": str(session_1_questions[0].id),
            "s1_signals": str(session_1_questions[1].id),
            "s1_items": str(session_1_questions[2].id),
            "s1_risk": str(session_1_questions[3].id),
            "s1_missing": str(session_1_questions[4].id),
            "s2_price": str(session_2_questions[0].id),
            "s2_supports": str(session_2_questions[1].id),
            "s2_alerts": str(session_2_questions[2].id),
            "s2_visible_items": str(session_2_questions[3].id),
            "s2_condition": str(session_2_questions[4].id),
            "s2_reason": str(session_2_questions[5].id),
        }

        seeded_payloads = [
            {
                "row_index": 0,
                "payload": {
                    question_ids["s1_price"]: "Fair",
                    question_ids["s1_signals"]: [
                        "No invoice",
                        "No box",
                        "Pickup only",
                        "Tested/working",
                    ],
                    question_ids["s1_items"]: 6,
                    question_ids["s1_risk"]: 4,
                    question_ids["s1_missing"]: (
                        "Origin needs proof and controller condition needs clearer photos."
                    ),
                    question_ids["s2_price"]: "Fair",
                    question_ids["s2_supports"]: "Partially",
                    question_ids["s2_alerts"]: ["None of these"],
                    question_ids["s2_visible_items"]: 4,
                    question_ids["s2_condition"]: 4,
                    question_ids["s2_reason"]: (
                        "The photos seem consistent, but do not prove everything in the listing."
                    ),
                },
            },
            {
                "row_index": 3,
                "payload": {
                    question_ids["s1_price"]: "Expensive",
                    question_ids["s1_signals"]: [
                        "Needs maintenance",
                        "Seller avoids details",
                    ],
                    question_ids["s1_items"]: 0,
                    question_ids["s1_risk"]: 5,
                    question_ids["s1_missing"]: (
                        "Groupset, frame number, and wear details are missing."
                    ),
                    question_ids["s2_price"]: "Expensive",
                    question_ids["s2_supports"]: "Partially",
                    question_ids["s2_alerts"]: ["Brand/model not visible"],
                    question_ids["s2_visible_items"]: 1,
                    question_ids["s2_condition"]: 3,
                    question_ids["s2_reason"]: (
                        "It seems used and real, but lacks clear proof of the components."
                    ),
                },
            },
            {
                "row_index": 4,
                "payload": {
                    question_ids["s1_price"]: "Fair",
                    question_ids["s1_signals"]: ["Other"],
                    question_ids["s1_items"]: 3,
                    question_ids["s1_risk"]: 3,
                    question_ids["s1_missing"]: (
                        "Shutter count and optical condition of the lens are missing."
                    ),
                    question_ids["s2_price"]: "Fair",
                    question_ids["s2_supports"]: "Partially",
                    question_ids["s2_alerts"]: ["Brand/model not visible"],
                    question_ids["s2_visible_items"]: 2,
                    question_ids["s2_condition"]: 4,
                    question_ids["s2_reason"]: (
                        "Photos show the kit, but without enough technical detail."
                    ),
                },
            },
        ]

        answers_created = 0
        for answer_data in seeded_payloads:
            item = Item.objects.filter(
                labeling=labeling,
                row_index=answer_data["row_index"],
            ).first()
            if item is None:
                raise CommandError(
                    f"Item row_index={answer_data['row_index']} not found for sample answer."
                )

            Answer.objects.create(
                labeling=labeling,
                item=item,
                answered_by=admin_user,
                answer_payload=answer_data["payload"],
            )
            answers_created += 1

            if Answer.objects.filter(item=item).count() >= labeling.users_per_item:
                item.status = "finished"
                item.save(update_fields=["status"])

        creator_membership = LabelingMembership.objects.filter(
            labeling=labeling,
            user=admin_user,
        ).first()
        if creator_membership and creator_membership.items_done != answers_created:
            creator_membership.items_done = answers_created
            creator_membership.save(update_fields=["items_done"])

        if labeling.items.exclude(status="finished").exists():
            desired_status = Labeling.Status.ACTIVE
        else:
            desired_status = Labeling.Status.FINISHED
        if labeling.status != desired_status:
            labeling.status = desired_status
            labeling.save(update_fields=["status"])

        return answers_created
