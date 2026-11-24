from item.models import Item
from labeling.models import Labeling
from user.models import UserGroup
from ..models import Answer
from .llm_tiebreak import run_llm_tiebreak_decision
from django.db.models import Q
from django.db import transaction


class LabelingFinished(Exception):
    """A rotulação já foi finalizada."""


class ItemNotFound(Exception):
    """O item não existe ou não pertence a esta rotulação."""


class ItemAlreadyFinished(Exception):
    """O item já foi finalizado e não aceita mais respostas."""


"""Registro de uma resposta e propagação do efeito em item e rotulação."""
from dataclasses import dataclass
from typing import Callable, Optional


# TODO: mover para common/constants.py (hoje repetidas em outros arquivos)
LLM_TIEBREAK_USERNAME = "llm_tiebreak_bot"
LLM_TIEBREAK_EMAIL = "llm_tiebreak_bot@annotaise.local"


class NoGroupSlot(Exception):
    """Os slots restantes do item são de outros grupos; a reserva foi liberada."""


@dataclass
class SubmitResult:
    decision_warning: Optional[str] = None

def submit_answer(
    *,
    user,
    item_id,
    membership,
    create_answer: Callable[[], Answer],
    decisive_answer: Optional[str] = None,
) -> SubmitResult:
    """
    Grava a resposta sob o lock do item, libera a reserva e propaga o efeito
    (voto de decisão, desempate, finalização do item e da rotulação).

    create_answer: função sem argumentos que persiste e devolve a Answer. Hoje é
    serializer.save, porque o serializer define answered_by e responded_as.
    """
    decision_warning = None

    with transaction.atomic():
        item = (
            Item.objects
            .select_for_update()
            .select_related("labeling")
            .get(id=item_id)
        )
        labeling = item.labeling

        slot_closed = not _has_open_group_slot(user, item, labeling)
        if slot_closed:
            membership.delete()
        else:
            create_answer()
            membership.delete()
            decision_warning = _apply_answer_effects(item, labeling, decisive_answer)

    # Levantada só depois do bloco: sair do atomic por exceção faria rollback
    # e desfaria o membership.delete(), que precisa ser comitado.
    if slot_closed:
        raise NoGroupSlot()

    return SubmitResult(decision_warning=decision_warning)


def _has_open_group_slot(user, item, labeling):
    # Cotas de grupo são checadas na distribuição, mas reservas não consomem slot:
    # entre reservar e responder, outras respostas podem ter ocupado a vaga.
    # Rechecar sob o lock do item (que serializa respostas concorrentes).
    if not labeling.has_group_quotas:
        return True
    user_group_names = set(
        UserGroup.objects
        .filter(memberships__user=user)
        .values_list("name", flat=True)
    )
    return Item._slot_open(item.remaining_groups(), user_group_names)


def _apply_answer_effects(item, labeling, decisive_answer):
    if labeling.decision:
        warning = _register_decision(item, labeling, decisive_answer)
        # O ramo de decisão não olha form_mode ao finalizar a rotulação
        # (comportamento original, mantido).
        _finalize_labeling_if_complete(labeling)
        return warning

    if not labeling.form_mode:
        if labeling.users_per_item <= Answer.objects.for_item(item.id).count():
            item.status = "finished"
            item.save(update_fields=["status"])
        _finalize_labeling_if_complete(labeling)
    return None

def _resolve_vote_winner(self, decision_dict):
    biggest = 0
    winner = None
    tied = False
    for answer, number_of_appearences in decision_dict.items():
        if number_of_appearences > biggest:
            biggest = number_of_appearences
            winner = answer
            tied = False
        elif number_of_appearences == biggest:
            tied = True
    return (winner is not None) and (not tied), winner

def _register_decision(item, labeling, decisive_answer):
    decisive_element = labeling.decisive_question
    votes = item.decision_payload or {}
    votes[decisive_answer] = votes.get(decisive_answer, 0) + 1
    item.decision_payload = votes
    fields = {"decision_payload"}
    warning = None

    if labeling.users_per_item <= Answer.objects.for_item(item.id).count():
        has_winner, winner = _resolve_vote_winner(votes)
        if has_winner:
            _finish_item(item, fields, source="human", value=winner)
        elif (
            labeling.decision_mode == Labeling.DecisionMode.LLM
            and not item.llm_tiebreak_attempted
        ):
            # TODO: IO externo dentro do atomic e do select_for_update.
            # Mover para transaction.on_commit em PR separado.
            warning = run_llm_tiebreak_decision(item, labeling, decisive_element, votes, fields)

    item.save(update_fields=list(fields))
    return warning


def _finish_item(item, fields, *, source, value):
    item.status = "finished"
    item.final_decision_source = source
    item.final_decision_value = value
    fields.update({"status", "final_decision_source", "final_decision_value"})


def _finalize_labeling_if_complete(labeling):
    if not labeling.items.filter(~Q(status="finished")).exists():
        labeling.status = "finished"
        labeling.save(update_fields=["status"])


def submit_anonymous_answer(*, labeling, item_id, answer_payload) -> Answer:
    """
    Registra uma resposta anônima (answered_by=None).

    O modo anônimo assume users_per_item=1 (cada visitante responde um item uma
    única vez), então o item é finalizado assim que recebe uma resposta, exceto
    em form_mode, onde os itens ficam abertos.
    """
    if labeling.status == "finished":
        raise LabelingFinished()

    if not str(item_id).isdigit():
        raise ItemNotFound()

    with transaction.atomic():
        item = (
            Item.objects
            .select_for_update()
            .filter(pk=int(item_id), labeling=labeling)
            .first()
        )
        if item is None:
            raise ItemNotFound()

        if not labeling.form_mode and item.status == "finished":
            raise ItemAlreadyFinished()

        answer = Answer.objects.create(
            item=item,
            labeling=labeling,
            answered_by=None,
            answer_payload=answer_payload,
        )

        if not labeling.form_mode:
            item.status = "finished"
            item.save(update_fields=["status"])
            _finalize_labeling_if_complete(labeling)

    return answer



