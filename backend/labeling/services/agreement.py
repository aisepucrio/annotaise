from collections import Counter, defaultdict

from rest_framework.exceptions import ValidationError

from answer.models import Answer
from ..models import LabelingElement, LabelingMembership, LabelingSection
from ..serializers import LLM_TIEBREAK_EMAIL, LLM_TIEBREAK_USERNAME
from . import metrics

# Only these produce a judgement on a scale; text/email/context have no metric.
SCALE_BY_QUESTION_TYPE = {
    LabelingElement.QuestionType.MULTIPLE_CHOICE: metrics.NOMINAL,
    LabelingElement.QuestionType.RANGE: metrics.ORDINAL,
    LabelingElement.QuestionType.NUMBER: metrics.INTERVAL,
}

#TODO One consequence to be aware of: labeling/services/agreement.py:87 filters role=ANNOTATOR, 
# so any promoted user drops out of inter-annotator 
# agreement summaries for labelings they had already annotated.
def parse_min_agreement(raw_value: str | None) -> int:
    if raw_value in (None, ""):
        return 2
    try:
        parsed_value = int(raw_value)
    except (TypeError, ValueError):
        raise ValidationError(
            detail={
                "detail": "min_agreement deve ser um número inteiro.",
                "code": "INVALID_MIN_AGREEMENT",
            }
        )

    if parsed_value < 2:
        raise ValidationError(
            detail={
                "detail": "min_agreement deve ser maior ou igual a 2.",
                "code": "INVALID_MIN_AGREEMENT",
            }
        )

    return parsed_value


def build_agreement_summary(labeling, min_agreement: int) -> dict:
    elements = (
        LabelingElement.objects
        .filter(
            labeling_section__labeling=labeling,
            labeling_section__form_type=LabelingSection.FormType.MAIN,
            question_type=LabelingElement.QuestionType.MULTIPLE_CHOICE,
        )
        .prefetch_related("multiple_choice_items")
    )

    question_meta = {}
    for element in elements:
        options = [
            item.text
            for item in element.multiple_choice_items.all().order_by("order", "id")
            if item.text and item.text.strip()
        ]
        question_meta[element.id] = {
            "ordered_options": options,
            "option_set": set(options),
        }

    if not question_meta:
        return {
            "min_agreement": min_agreement,
            "max_min_agreement": 2,
            "questions": [],
        }

    latest_by_item_user = collect_responses(labeling)

    responders = {
        answer["answered_by_id"]
        for answer in latest_by_item_user.values()
        if answer.get("answered_by_id") is not None
    }
    annotator_count = (
        LabelingMembership.objects
        .filter(labeling=labeling, role=LabelingMembership.Role.ANNOTATOR)
        .values("user_id")
        .distinct()
        .count()
    )
    max_min_agreement = max(2, annotator_count, len(responders))
    if min_agreement > max_min_agreement:
        raise ValidationError(
            detail={
                "detail": (
                    f"min_agreement deve estar entre 2 e {max_min_agreement} "
                    "para esta rotulação."
                ),
                "code": "INVALID_MIN_AGREEMENT",
            }
        )

    per_question = {
        question_id: {
            "item_responders": defaultdict(set),
            "option_users_by_item": defaultdict(lambda: defaultdict(set)),
            "other_present": False,
        }
        for question_id in question_meta.keys()
    }

    for answer in latest_by_item_user.values():
        payload = answer.get("answer_payload") or {}
        item_id = answer["item_id"]
        user_id = answer["answered_by_id"]

        for question_id, meta in question_meta.items():
            raw_value = _resolve_payload_value(payload, question_id)
            normalized_choices = _normalize_choice_values(raw_value)
            if not normalized_choices:
                continue

            per_question[question_id]["item_responders"][item_id].add(user_id)
            selected_options = set()
            for choice in normalized_choices:
                if choice in meta["option_set"]:
                    selected_options.add(choice)
                else:
                    selected_options.add("__other__")
                    per_question[question_id]["other_present"] = True

            for option in selected_options:
                per_question[question_id]["option_users_by_item"][item_id][option].add(user_id)

    questions = []
    for question_id, meta in question_meta.items():
        state = per_question[question_id]
        possible_agreements = len(state["item_responders"])

        ordered_options = list(meta["ordered_options"])
        if state["other_present"]:
            ordered_options.append("__other__")

        options_output = []
        for option in ordered_options:
            agreement_count = 0
            for item_id, option_users in state["option_users_by_item"].items():
                users = option_users.get(option, set())
                if len(users) >= min_agreement:
                    agreement_count += 1

            options_output.append({
                "key": option,
                "label": option,
                "agreement_count": agreement_count,
            })

        questions.append({
            "question_id": question_id,
            "possible_agreements": possible_agreements,
            "options": options_output,
        })

    return {
        "min_agreement": min_agreement,
        "max_min_agreement": max_min_agreement,
        "questions": questions,
    }


def _resolve_payload_value(payload, question_id):
    if not isinstance(payload, dict):
        return None

    question_key = str(question_id)
    if question_key in payload:
        return payload.get(question_key)

    if question_id in payload:
        return payload.get(question_id)

    return None


def _normalize_choice_values(value):
    entries = value if isinstance(value, list) else [value]
    normalized = []
    for entry in entries:
        if entry is None:
            continue
        if isinstance(entry, bool):
            normalized.append("true" if entry else "false")
            continue
        text = str(entry).strip()
        if not text:
            continue
        lowered = text.lower()
        if lowered in {"true", "false"}:
            normalized.append(lowered)
        else:
            normalized.append(text)
    # dedupe repeated choices within the same answer, preserving order
    return list(dict.fromkeys(normalized))


def collect_responses(labeling, exclude_llm_bot: bool = False) -> dict:
    """Latest answer per (item, user).

    `Answer` has no unique constraint on (item, answered_by), so a re-answer is a
    second row: newest wins. Rows with no item or no annotator are skipped —
    which also covers `anonymous_mode`, where `users_per_item` is 1 anyway.
    """
    answers = Answer.objects.filter(labeling=labeling)
    if exclude_llm_bot:
        answers = (
            answers
            .exclude(answered_by__username=LLM_TIEBREAK_USERNAME)
            .exclude(answered_by__email__iexact=LLM_TIEBREAK_EMAIL)
        )

    answers = (
        answers
        .order_by("-created_at", "-id")
        .values("item_id", "answered_by_id", "answer_payload")
    )

    latest_by_item_user = {}
    for answer in answers:
        answered_by_id = answer.get("answered_by_id")
        item_id = answer.get("item_id")
        if answered_by_id is None or item_id is None:
            continue
        key = (item_id, answered_by_id)
        if key not in latest_by_item_user:
            latest_by_item_user[key] = answer

    return latest_by_item_user


def build_reliability_report(labeling) -> dict:
    """Krippendorff's alpha, percentage agreement and Fleiss' kappa per question.

    Unlike `build_agreement_summary`, the LLM tiebreak bot is excluded: it is a
    real user producing real answers, but its judgement is not a human one.
    """
    elements = (
        LabelingElement.objects
        .filter(
            labeling_section__labeling=labeling,
            labeling_section__form_type=LabelingSection.FormType.MAIN,
            question_type__in=SCALE_BY_QUESTION_TYPE.keys(),
        )
        .prefetch_related("multiple_choice_items")
        .order_by("id")
    )
    # TODO Not sure if llm bot response counts to agreement
    responses = collect_responses(labeling, exclude_llm_bot=True)
    return {
        "questions": [_question_reliability(element, responses) for element in elements],
    }


def _question_reliability(element, responses) -> dict:
    option_set = {
        item.text.strip()
        for item in element.multiple_choice_items.all()
        if item.text and item.text.strip()
    }

    units = defaultdict(list)
    annotators = set()
    has_unknown_options = False

    for (item_id, user_id), answer in responses.items():
        raw_value = _resolve_payload_value(answer.get("answer_payload") or {}, element.id)
        value, unknown = _reliability_value(element, raw_value, option_set)
        if value is None:
            continue
        has_unknown_options = has_unknown_options or unknown
        units[item_id].append(value)
        annotators.add(user_id)

    comparable = {item_id: values for item_id, values in units.items() if len(values) >= 2}
    scale = SCALE_BY_QUESTION_TYPE[element.question_type]
    if element.question_type == LabelingElement.QuestionType.MULTIPLE_CHOICE and element.allow_multiple:
        scale = metrics.MASI

    return {
        "question_id": element.id,
        "question_type": element.question_type,
        "scale": scale,
        "annotators": len(annotators),
        "items_considered": len(comparable),
        "excluded_items": len(units) - len(comparable),
        "has_unknown_options": has_unknown_options,
        "krippendorff_alpha": _estimate(lambda u: metrics.krippendorff_alpha(u, scale), comparable),
        "percent_agreement": _estimate(metrics.percent_agreement, comparable),
        "fleiss_kappa": _fleiss(element, comparable),
    }


def _fleiss(element, comparable) -> dict | None:
    """Fleiss needs one rating count for every item, so run it on the modal slice."""
    if element.question_type != LabelingElement.QuestionType.MULTIPLE_CHOICE:
        return None

    sizes = Counter(len(values) for values in comparable.values())
    if not sizes:
        return None

    # most items win; on a tie prefer the larger panel, it carries more information
    ratings_per_item = max(sizes.items(), key=lambda entry: (entry[1], entry[0]))[0]
    balanced = {
        item_id: values
        for item_id, values in comparable.items()
        if len(values) == ratings_per_item
    }
    return _estimate(metrics.fleiss_kappa, balanced) | {
        "items_used": len(balanced),
        "ratings_per_item": ratings_per_item,
    }


def _estimate(metric, units) -> dict:
    value = metric(units)
    interval = metrics.bootstrap_ci(metric, units) if value is not None else None
    return {
        "value": value,
        "ci_low": interval[0] if interval else None,
        "ci_high": interval[1] if interval else None,
    }


def _reliability_value(element, raw_value, option_set):
    """(value, whether it fell outside the declared options). None means no answer."""
    if element.question_type == LabelingElement.QuestionType.MULTIPLE_CHOICE:
        choices = _normalize_choice_values(raw_value)
        if not choices:
            return None, False
        # options are matched by text, so renaming one dumps its history into __other__
        mapped = [choice if choice in option_set else "__other__" for choice in choices]
        unknown = "__other__" in mapped
        if element.allow_multiple:
            return frozenset(mapped), unknown
        return mapped[0], unknown

    if isinstance(raw_value, bool):
        return None, False
    try:
        return float(raw_value), False
    except (TypeError, ValueError):
        return None, False
