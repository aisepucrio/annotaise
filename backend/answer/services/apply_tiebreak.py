from django.db import transaction

from answer.models import Answer
from item.models import Item

from .record_answer import finalize_labeling_if_complete, vote_winner
from .tiebreak_bot import get_or_create_tiebreak_bot

STALE_RESULT_ERROR = "ITEM_ALREADY_DECIDED"


@transaction.atomic
def apply_tiebreak_result(*, item_id, decisive_element_id, llm_result):
    item = (
        Item.objects
        .select_for_update()
        .select_related("labeling")
        .get(id=item_id)
    )

    # A LLM roda sem lock: nesse meio tempo um humano pode ter decidido o item.
    if _already_decided(item):
        item.llm_tiebreak_result = {**llm_result, "applied": False, "error": STALE_RESULT_ERROR}
        item.save(update_fields=["llm_tiebreak_result"])
        return None

    item.llm_tiebreak_result = llm_result
    fields_to_update = ["llm_tiebreak_result"]

    llm_winner = llm_result.get("winner")
    if llm_winner:
        _record_llm_vote(item, decisive_element_id, llm_winner)
        fields_to_update += ["decision_payload", "status", "final_decision_source", "final_decision_value"]

    item.save(update_fields=fields_to_update)
    finalize_labeling_if_complete(item.labeling)

    return llm_result.get("error_message")


def _already_decided(item):
    return item.status == "finished" or vote_winner(item.decision_payload or {}) is not None


def _record_llm_vote(item, decisive_element_id, llm_winner):
    Answer.objects.create(
        item=item,
        labeling=item.labeling,
        answered_by=get_or_create_tiebreak_bot(),
        answer_payload={str(decisive_element_id): llm_winner},
    )
    decision_dict = item.decision_payload or {}
    decision_dict[llm_winner] = decision_dict.get(llm_winner, 0) + 1
    item.decision_payload = decision_dict
    item.status = "finished"
    item.final_decision_source = "llm"
    item.final_decision_value = llm_winner
