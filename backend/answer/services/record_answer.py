from dataclasses import dataclass, field

from django.db import transaction
from django.db.models import Q

from answer.models import Answer
from item.models import Item, ItemMembership
from labeling.models import Labeling, LabelingElement, LabelingSection
from user.models import UserGroup

from .exceptions import DecisionInputError, ItemAlreadyFinished, ReservationMissing

@dataclass
class TiebreakRequest:
    item_id: int
    labeling: Labeling
    decisive_element_id: int
    question_text: str
    options: list = field(default_factory=list)
    contexts: list = field(default_factory=list)


def decisive_answer_from_payload(labeling, answer_payload):
    if not labeling.decision:
        return None

    decisive_element = labeling.decisive_question
    if decisive_element is None:
        raise DecisionInputError(
            'Rotulação configurada para decisão, mas pergunta decisiva não definida. '
            'Contate o dono da rotulação.'
        )

    value = None
    if isinstance(answer_payload, dict):
        value = answer_payload.get(str(decisive_element.id))
        if value is None:
            value = answer_payload.get(decisive_element.id)
    if value is None:
        raise DecisionInputError("Resposta da pergunta decisiva não encontrada.")

    return str(value)


@transaction.atomic
def record_answer(*, user, item_id, answer_payload, decisive_answer):
    item = (
        Item.objects
        .select_for_update()
        .select_related("labeling")
        .get(id=item_id)
    )
    labeling = item.labeling

    # submit_answer already checked, but another answer may have finished the
    # item before this lock. Raising is safe here, nothing has been written yet.
    if item.status == "finished":
        raise ItemAlreadyFinished()

    # HasItemReservationPermission ran before this transaction: the reservation
    # may have been stolen, or consumed by a concurrent submission.
    reservation = (
        ItemMembership.objects
        .select_for_update()
        .filter(user=user, item_id=item_id)
        .first()
    )
    if reservation is None:
        raise ReservationMissing()

    if not _group_slot_still_open(item, labeling, user):
        reservation.delete()
        return None, None

    answer = Answer.objects.create(
        item=item,
        labeling=labeling,
        answer_payload=answer_payload,
        answered_by=user,
        responded_as=item.pick_responded_as_for(user),
    )
    reservation.delete()

    if not labeling.decision:
        _close_item_without_decision(item, labeling)
        return answer, None

    tiebreak_request = _count_decisive_vote(item, labeling, decisive_answer)

    if tiebreak_request is None:
        finalize_labeling_if_complete(labeling)

    return answer, tiebreak_request


def _group_slot_still_open(item, labeling, user):
    if not labeling.has_group_quotas:
        return True
    user_group_names = set(
        UserGroup.objects
        .filter(memberships__user=user)
        .values_list('name', flat=True)
    )
    return Item._slot_open(item.remaining_groups(), user_group_names)


def _count_decisive_vote(item, labeling, decisive_answer):
    decision_dict = item.decision_payload or {}
    decision_dict[decisive_answer] = decision_dict.get(decisive_answer, 0) + 1
    item.decision_payload = decision_dict
    fields_to_update = ["decision_payload"]
    tiebreak_request = None

    answer_count = Answer.objects.filter(item_id=item.id).count()
    if labeling.users_per_item <= answer_count:
        winner = vote_winner(decision_dict)
        if winner is not None:
            item.status = "finished"
            item.final_decision_source = "human"
            item.final_decision_value = winner
            fields_to_update += ["status", "final_decision_source", "final_decision_value"]
        elif labeling.decision_mode == Labeling.DecisionMode.LLM and not item.llm_tiebreak_attempted:
            item.llm_tiebreak_attempted = True
            fields_to_update.append("llm_tiebreak_attempted")
            tiebreak_request = _tiebreak_request_for(item, labeling)

    item.save(update_fields=fields_to_update)
    return tiebreak_request


def _tiebreak_request_for(item, labeling):
    decisive_element = labeling.decisive_question
    return TiebreakRequest(
        item_id=item.id,
        labeling=labeling,
        decisive_element_id=decisive_element.id,
        question_text=decisive_element.text,
        options=list(
            decisive_element.multiple_choice_items
            .order_by("order", "id")
            .values_list("text", flat=True)
        ),
        contexts=_llm_contexts(item),
    )


def _close_item_without_decision(item, labeling):
    if labeling.form_mode:
        return

    if labeling.users_per_item <= Answer.objects.filter(item_id=item.id).count():
        item.status = 'finished'
        item.save(update_fields=["status"])

    finalize_labeling_if_complete(labeling)


def finalize_labeling_if_complete(labeling):
    if not labeling.items.filter(~Q(status='finished')).exists():
        labeling.status = 'finished'
        labeling.save()


def vote_winner(decision_dict):
    if not decision_dict:
        return None
    biggest = max(decision_dict.values())
    top = [answer for answer, votes in decision_dict.items() if votes == biggest]
    return top[0] if len(top) == 1 else None


def _llm_contexts(item):
    payload = item.payload if isinstance(item.payload, dict) else {}
    context_elements = (
        LabelingElement.objects
        .filter(
            labeling_section__labeling=item.labeling,
            labeling_section__form_type=LabelingSection.FormType.MAIN,
            question_type=LabelingElement.QuestionType.CONTEXT,
        )
        .order_by("labeling_section__order", "order", "id")
    )

    contexts = []
    for element in context_elements:
        value = payload.get(element.column_name) if element.column_name else None
        if value is None:
            value = payload.get(str(element.id), payload.get(element.id))

        contexts.append(
            {
                "context_type": element.context_type or "text",
                "label": element.text or element.column_name or f"contexto_{element.id}",
                "column_name": element.column_name,
                "value": value,
            }
        )
    return contexts
