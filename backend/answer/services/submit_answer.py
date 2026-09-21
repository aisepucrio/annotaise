"""Escrita da resposta de um item e a propagação dela em item e rotulação.

Entrada única do POST /answers/ (designpattern.MD §3.3). A view valida o
formato, escolhe a permissão e chama daqui para baixo — não decide domínio.

O desempate por LLM roda **fora** da transação (§5.4), então a operação é
partida em duas:

1. `_record_answer` grava a resposta sob o lock do item e, quando o placar
   empata em modo LLM, já marca `llm_tiebreak_attempted` — é o que impede duas
   respostas concorrentes de dispararem dois desempates.
2. `_apply_tiebreak_result` volta a pegar o lock só para gravar o resultado.

Entre as duas o item fica empatado e ainda sem resultado. É o preço de não
segurar `select_for_update` durante uma chamada de rede: com BYOK o desempate
fala com um provedor externo e pode levar o timeout inteiro (60s por padrão),
e o caminho antigo mantinha o item travado esse tempo todo.
"""

from dataclasses import dataclass, field

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q

from answer.models import Answer
from item.models import Item
from labeling.models import Labeling, LabelingElement, LabelingSection
from user.models import UserGroup

from .tiebreak import error_result, run_tiebreak_decision

# Usuário que assina as respostas do desempate por LLM. Precisa ficar fora de
# toda listagem de pessoas — ver designpattern.MD §5.6.
LLM_TIEBREAK_USERNAME = "llm_tiebreak_bot"
LLM_TIEBREAK_EMAIL = "llm_tiebreak_bot@annotaise.local"


class NoGroupSlotAvailable(Exception):
    """As vagas que sobraram no item são reservadas a outros grupos.

    Quando isto sobe a reserva do usuário já foi liberada e o commit já
    aconteceu: quem chamou só precisa mandar o frontend pedir outro item.
    """

    def __init__(self):
        super().__init__("Os slots restantes deste item são reservados para outros grupos.")


class DecisionInputError(Exception):
    """Falta o que é preciso para computar o voto da pergunta decisiva.

    Sobe antes de qualquer escrita: nem a resposta nem a reserva são tocadas.
    """


@dataclass
class SubmitAnswerResult:
    """O que a view precisa para montar a resposta HTTP."""

    answer: Answer
    decision_warning: str | None = None


def submit_answer(*, user, item, membership, answer_payload, session_llm_key):
    """Registra a resposta do usuário e fecha item/rotulação quando for o caso."""
    decisive_answer = _resolve_decisive_answer(item.labeling, answer_payload)

    outcome = _record_answer(
        user=user,
        item_id=item.id,
        membership=membership,
        answer_payload=answer_payload,
        decisive_answer=decisive_answer,
    )

    if outcome.no_group_slot:
        raise NoGroupSlotAvailable()

    decision_warning = None
    if outcome.pending_tiebreak:
        # Fora de qualquer transação: é chamada de rede (§5.4).
        llm_result = _run_tiebreak(outcome, session_llm_key=session_llm_key)
        decision_warning = _apply_tiebreak_result(
            item_id=item.id,
            decisive_element_id=outcome.decisive_element_id,
            llm_result=llm_result,
        )

    return SubmitAnswerResult(answer=outcome.answer, decision_warning=decision_warning)


@dataclass
class _RecordOutcome:
    """Estado da primeira transação que a segunda etapa ainda precisa."""

    answer: Answer | None = None
    no_group_slot: bool = False
    pending_tiebreak: bool = False
    labeling: Labeling | None = None
    decisive_element_id: int | None = None
    decisive_question_text: str = ""
    options: list = field(default_factory=list)
    contexts: list = field(default_factory=list)


@transaction.atomic
def _record_answer(*, user, item_id, membership, answer_payload, decisive_answer):
    item = (
        Item.objects
        .select_for_update()
        .select_related("labeling")
        .get(id=item_id)
    )
    labeling = item.labeling

    # Cotas por grupo são checadas na distribuição, mas reservas não consomem
    # slots: entre a reserva e o envio, outras respostas podem ter preenchido
    # os slots que este usuário poderia ocupar. Recheca sob o lock do item (que
    # serializa respostas concorrentes) e, se não sobrou slot compatível, libera
    # a reserva e avisa quem chamou para buscar outro item.
    if labeling.has_group_quotas:
        user_group_names = set(
            UserGroup.objects
            .filter(memberships__user=user)
            .values_list('name', flat=True)
        )
        if not Item._slot_open(item.remaining_groups(), user_group_names):
            # Sai do bloco pelo `return`, não por exceção: a liberação da
            # reserva precisa ser commitada.
            membership.delete()
            return _RecordOutcome(no_group_slot=True)

    answer = Answer.objects.create(
        item=item,
        labeling=labeling,
        answer_payload=answer_payload,
        answered_by=user,
        responded_as=item.pick_responded_as_for(user),
    )

    # Remove a reserva do item
    membership.delete()

    if not labeling.decision:
        _close_item_without_decision(item_id=item_id, labeling=labeling)
        return _RecordOutcome(answer=answer, labeling=labeling)

    outcome = _RecordOutcome(answer=answer, labeling=labeling)
    decisive_element = labeling.decisive_question

    decision_dict = item.decision_payload or {}
    fields_to_update = ["decision_payload"]

    decision_dict[decisive_answer] = decision_dict.get(decisive_answer, 0) + 1
    item.decision_payload = decision_dict

    answer_count = Answer.objects.filter(item_id=item_id).count()
    if labeling.users_per_item <= answer_count:
        has_winner, biggest_answer = _resolve_vote_winner(decision_dict)
        if has_winner:
            item.status = "finished"
            item.final_decision_source = "human"
            item.final_decision_value = biggest_answer
            fields_to_update.extend(
                ["status", "final_decision_source", "final_decision_value"]
            )
        elif (
            labeling.decision_mode == Labeling.DecisionMode.LLM
            and not item.llm_tiebreak_attempted
        ):
            # Marcado já aqui, sob o lock: duas respostas concorrentes que
            # empatem não podem disparar dois desempates.
            item.llm_tiebreak_attempted = True
            fields_to_update.append("llm_tiebreak_attempted")

            outcome.pending_tiebreak = True
            outcome.decisive_element_id = decisive_element.id
            outcome.decisive_question_text = decisive_element.text
            outcome.options = list(
                decisive_element.multiple_choice_items.order_by("order", "id").values_list(
                    "text", flat=True
                )
            )
            outcome.contexts = _build_llm_contexts(item)

    item.save(update_fields=list(dict.fromkeys(fields_to_update)))

    # Com desempate pendente, fechar a rotulação fica para a segunda transação:
    # este item continua em aberto até lá.
    if not outcome.pending_tiebreak:
        _finalize_labeling_if_complete(labeling)

    return outcome


def _close_item_without_decision(*, item_id, labeling):
    """Rotulação sem decisão: fecha o item ao bater a cota de respostas."""
    item = Item.objects.select_related('labeling').get(id=item_id)

    if not labeling.form_mode and item.labeling.users_per_item <= Answer.objects.filter(item__id=item_id).count():
        item.status = 'finished'
        item.save()

    if not labeling.form_mode:
        _finalize_labeling_if_complete(labeling)


def _run_tiebreak(outcome, *, session_llm_key):
    """Chamada externa do desempate. Falha vira resultado, não exceção.

    Um erro aqui não pode derrubar o POST: a resposta do usuário já foi
    gravada e commitada, e o item guarda o motivo em `llm_tiebreak_result`.
    """
    try:
        return run_tiebreak_decision(
            labeling=outcome.labeling,
            session_llm_key=session_llm_key,
            question_text=outcome.decisive_question_text,
            options=outcome.options,
            contexts=outcome.contexts,
        )
    except Exception as exc:
        return error_result(
            str(exc),
            "Não foi possível executar a decisão por LLM neste item.",
        )


@transaction.atomic
def _apply_tiebreak_result(*, item_id, decisive_element_id, llm_result):
    """Grava o resultado do desempate e fecha o item se houve vencedor.

    Devolve o aviso que a view repassa ao frontend, ou `None`.
    """
    item = (
        Item.objects
        .select_for_update()
        .select_related("labeling")
        .get(id=item_id)
    )
    labeling = item.labeling

    item.llm_tiebreak_result = llm_result
    fields_to_update = ["llm_tiebreak_result"]

    llm_winner = llm_result.get("winner")
    if llm_winner:
        llm_user = _get_or_create_llm_tiebreak_user()
        Answer.objects.create(
            item=item,
            labeling=labeling,
            answered_by=llm_user,
            answer_payload={str(decisive_element_id): llm_winner},
        )
        decision_dict = item.decision_payload or {}
        decision_dict[llm_winner] = decision_dict.get(llm_winner, 0) + 1
        item.decision_payload = decision_dict
        item.status = "finished"
        item.final_decision_source = "llm"
        item.final_decision_value = llm_winner
        fields_to_update.extend(
            [
                "status",
                "final_decision_source",
                "final_decision_value",
                "decision_payload",
            ]
        )

    item.save(update_fields=list(dict.fromkeys(fields_to_update)))
    _finalize_labeling_if_complete(labeling)

    return llm_result.get("error_message")


def _resolve_decisive_answer(labeling, answer_payload):
    """Voto deste usuário na pergunta decisiva, ou `None` fora do modo decisão.

    O payload chega do frontend com as chaves em string, mas nem sempre: aceita
    as duas formas antes de desistir.
    """
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


def _finalize_labeling_if_complete(labeling):
    """Fecha a rotulação quando não sobra nenhum item em aberto."""
    if not labeling.items.filter(~Q(status='finished')).exists():
        labeling.status = 'finished'
        labeling.save()


def _resolve_vote_winner(decision_dict):
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


def _build_llm_contexts(item):
    payload = item.payload if isinstance(item.payload, dict) else {}
    contexts = []
    context_elements = (
        LabelingElement.objects
        .filter(
            labeling_section__labeling=item.labeling,
            labeling_section__form_type=LabelingSection.FormType.MAIN,
            question_type=LabelingElement.QuestionType.CONTEXT,
        )
        .order_by("labeling_section__order", "order", "id")
    )

    for element in context_elements:
        value = None
        if element.column_name:
            value = payload.get(element.column_name)
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


def _get_or_create_llm_tiebreak_user():
    User = get_user_model()

    user = User.objects.filter(username=LLM_TIEBREAK_USERNAME).first()
    if user:
        return user

    user = User.objects.filter(email__iexact=LLM_TIEBREAK_EMAIL).first()
    if user:
        if not user.username:
            user.username = LLM_TIEBREAK_USERNAME
            user.save(update_fields=["username"])
        return user

    user = User.objects.create(
        username=LLM_TIEBREAK_USERNAME,
        email=LLM_TIEBREAK_EMAIL,
        first_name="LLM",
        last_name="TieBreak",
        account_type="standard",
        is_active=True,
        onboarding_status="active",
    )
    user.set_unusable_password()
    user.save(update_fields=["password"])
    return user
