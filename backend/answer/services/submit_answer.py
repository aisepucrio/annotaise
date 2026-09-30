from dataclasses import dataclass

from django.views.decorators.debug import sensitive_variables

from answer.models import Answer, BackgroundAnswer

from .apply_tiebreak import apply_tiebreak_result
from .exceptions import BackgroundFormRequired, ItemAlreadyFinished, NoGroupSlotAvailable
from .llm_tiebreak import tiebreak_result
from .record_answer import decisive_answer_from_payload, record_answer
from .tiebreak import run_tiebreak_decision

TIEBREAK_FAILED_MESSAGE = "Não foi possível executar a decisão por LLM neste item."


@dataclass
class SubmitAnswerResult:
    answer: Answer
    decision_warning: str | None = None


@sensitive_variables("session_llm_key")
def submit_answer(*, user, item, answer_payload, session_llm_key):
    labeling = item.labeling
    if item.status == "finished":
        raise ItemAlreadyFinished()
    if labeling.has_background_form and not BackgroundAnswer.objects.filter(
        labeling=labeling, answered_by=user
    ).exists():
        raise BackgroundFormRequired()

    decisive_answer = decisive_answer_from_payload(labeling, answer_payload)

    answer, tiebreak_request = record_answer(
        user=user,
        item_id=item.id,
        answer_payload=answer_payload,
        decisive_answer=decisive_answer,
    )
    if answer is None:
        raise NoGroupSlotAvailable()

    decision_warning = None
    if tiebreak_request is not None:
        # Fora da transação: a chamada ao provedor pode levar até o timeout.
        llm_result = _run_tiebreak(tiebreak_request, session_llm_key)
        decision_warning = apply_tiebreak_result(
            item_id=tiebreak_request.item_id,
            decisive_element_id=tiebreak_request.decisive_element_id,
            llm_result=llm_result,
        )

    return SubmitAnswerResult(answer=answer, decision_warning=decision_warning)


@sensitive_variables("session_llm_key")
def _run_tiebreak(request, session_llm_key):
    try:
        return run_tiebreak_decision(
            labeling=request.labeling,
            session_llm_key=session_llm_key,
            question_text=request.question_text,
            options=request.options,
            contexts=request.contexts,
        )
    except Exception as exc:
        return tiebreak_result(
            model_pool=None, error=str(exc), error_message=TIEBREAK_FAILED_MESSAGE
        )
