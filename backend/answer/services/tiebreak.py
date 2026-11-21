from django.views.decorators.debug import sensitive_variables

from annotaise.crypto import decrypt_secret
from labeling.models import AIProvider

from .llm_tiebreak import (
    BYOK_MODEL_POOL,
    run_llm_tiebreak_decision,
    run_llm_tiebreak_decision_byok,
    tiebreak_result,
)

BYOK_ERROR = ("BYOK_ERROR", "Não foi possível executar a decisão por LLM (BYOK).")
PROVIDER_MISSING = ("BYOK_PROVIDER_MISSING", "Chave de IA enviada sem um provedor válido.")


def _byok_error(error):
    code, message = error
    return tiebreak_result(model_pool=BYOK_MODEL_POOL, error=code, error_message=message)


@sensitive_variables("session_llm_key", "session_api_key", "api_key")
def run_tiebreak_decision(*, labeling, session_llm_key, question_text, options, contexts):
    """Chave da sessão > credencial da rotulação > Ollama local."""
    session_provider, session_api_key = session_llm_key
    credential = labeling.ai_credential
    question = {"question_text": question_text, "options": options, "contexts": contexts}

    if not session_api_key and credential is None:
        return run_llm_tiebreak_decision(labeling_guide=labeling.guide, **question)

    if session_api_key:
        provider = session_provider or (credential.provider if credential else None)
        if provider not in AIProvider.values:
            return _byok_error(PROVIDER_MISSING)
        api_key = session_api_key
    else:
        provider = credential.provider
        try:
            api_key = decrypt_secret(credential.encrypted_api_key)
        except Exception:
            return _byok_error(BYOK_ERROR)

    try:
        return run_llm_tiebreak_decision_byok(
            provider=provider, api_key=api_key, labeling_guide=labeling.guide, **question
        )
    except Exception:
        return _byok_error(BYOK_ERROR)
