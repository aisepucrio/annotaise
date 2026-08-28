"""Entrada única do desempate por LLM: decide de onde vem a chave e executa.

Ordem de precedência da chave: a que o usuário mandou no header desta
requisição (modo "usar só nesta sessão") vence a credencial salva na rotulação;
sem nenhuma das duas, cai no Ollama local.

Nenhuma chave é gravada ou registrada aqui — a da sessão só existe como
argumento e a salva só como resultado do decrypt, pelo tempo da chamada.
Falha de LLM nunca derruba o POST da resposta: volta como resultado de erro
para o item guardar em `llm_tiebreak_result`.
"""

from django.views.decorators.debug import sensitive_variables

from annotaise.crypto import decrypt_secret
from labeling.models import AICredential

from .llm_tiebreak import run_llm_tiebreak_decision, run_llm_tiebreak_decision_byok

BYOK_ERROR_MESSAGE = "Não foi possível executar a decisão por LLM (BYOK)."
PROVIDER_MISSING_MESSAGE = "Chave de IA enviada sem um provedor válido."


def _error_result(code, message):
    """Falha no mesmo formato que `run_llm_tiebreak_decision` devolve."""
    return {
        "models": [],
        "vote_count": {},
        "winner": None,
        "tied": False,
        "valid_votes": 0,
        "error": code,
        "error_message": message,
    }


@sensitive_variables("api_key")
def _run_byok(*, provider, api_key, labeling, question_text, options, contexts):
    try:
        return run_llm_tiebreak_decision_byok(
            provider=provider,
            api_key=api_key,
            labeling_guide=labeling.guide,
            question_text=question_text,
            options=options,
            contexts=contexts,
        )
    except Exception:
        return _error_result("BYOK_ERROR", BYOK_ERROR_MESSAGE)


@sensitive_variables("session_llm_key", "session_api_key", "api_key")
def run_tiebreak_decision(*, labeling, session_llm_key, question_text, options, contexts):
    """Roda o desempate da rotulação com a chave de maior precedência."""
    provider, session_api_key = session_llm_key
    credential = labeling.ai_credential

    if session_api_key:
        # Sem o header de provedor dá para aproveitar o da credencial vinculada:
        # escolher "só nesta sessão" muda onde a chave mora, não o provedor.
        provider = provider or (credential.provider if credential else None)
        if provider not in AICredential.Provider.values:
            return _error_result("BYOK_PROVIDER_MISSING", PROVIDER_MISSING_MESSAGE)
        return _run_byok(
            provider=provider,
            api_key=session_api_key,
            labeling=labeling,
            question_text=question_text,
            options=options,
            contexts=contexts,
        )

    if credential is not None:
        try:
            api_key = decrypt_secret(credential.encrypted_api_key)
        except Exception:
            return _error_result("BYOK_ERROR", BYOK_ERROR_MESSAGE)
        return _run_byok(
            provider=credential.provider,
            api_key=api_key,
            labeling=labeling,
            question_text=question_text,
            options=options,
            contexts=contexts,
        )

    return run_llm_tiebreak_decision(
        labeling_guide=labeling.guide,
        question_text=question_text,
        options=options,
        contexts=contexts,
    )
