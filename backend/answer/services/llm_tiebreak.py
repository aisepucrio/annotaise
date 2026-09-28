from collections import Counter
from datetime import datetime, timezone

from django.views.decorators.debug import sensitive_variables

from . import llm_clients
from .llm_prompt import (
    UnsupportedContext,
    build_prompt,
    format_contexts,
    normalized_options,
    parse_vote,
)

OLLAMA_MODELS_CODE = [
    "qwen3-coder:30b",
    "qwen2.5-coder:32b",
    "deepseek-coder-v2:16b",
]

OLLAMA_MODELS_GENERAL = [
    "llama3.1:8b",
    "llama3.2:3b",
    "qwen2.5:7b",
    "mistral-nemo:12b",
]

BYOK_MODEL_POOL = "byok"

NO_VALID_OPTIONS = ("NO_VALID_OPTIONS", "Não há opções válidas para a pergunta decisiva.")

_MAX_ERROR_LENGTH = 500


def tiebreak_result(*, model_pool, models_used=(), models=(), vote_count=None, error=None, error_message=None):
    vote_count = dict(vote_count or {})
    winner, tied = _winner_from_votes(vote_count)
    return {
        "attempted_at": datetime.now(timezone.utc).isoformat(),
        "model_pool": model_pool,
        "models_used": list(models_used),
        "models": list(models),
        "vote_count": vote_count,
        "winner": winner,
        "tied": tied,
        "valid_votes": sum(vote_count.values()),
        "error": error,
        "error_message": error_message,
    }


def run_llm_tiebreak_decision(*, labeling_guide, question_text, options, contexts):
    models, pool = _ollama_models_for(contexts)
    return _vote(
        model_pool=pool,
        models=models,
        ask=llm_clients.ollama_generate,
        labeling_guide=labeling_guide,
        question_text=question_text,
        options=options,
        contexts=contexts,
    )


@sensitive_variables("api_key")
def run_llm_tiebreak_decision_byok(*, provider, api_key, labeling_guide, question_text, options, contexts):
    model_name = llm_clients.PROVIDER_MODEL_MAP.get(provider)
    if not model_name:
        return tiebreak_result(
            model_pool=BYOK_MODEL_POOL,
            error="UNSUPPORTED_PROVIDER",
            error_message=f"Provedor de IA não suportado: {provider}.",
        )

    return _vote(
        model_pool=BYOK_MODEL_POOL,
        models=[model_name],
        ask=lambda model, prompt: llm_clients.cloud_completion(model, api_key, prompt),
        secret=api_key,
        labeling_guide=labeling_guide,
        question_text=question_text,
        options=options,
        contexts=contexts,
    )


@sensitive_variables("secret")
def _vote(*, model_pool, models, ask, labeling_guide, question_text, options, contexts, secret=None):
    options_by_key = normalized_options(options)
    if not options_by_key:
        code, message = NO_VALID_OPTIONS
        return tiebreak_result(model_pool=model_pool, error=code, error_message=message)

    try:
        contexts_text = format_contexts(contexts)
    except UnsupportedContext as exc:
        return tiebreak_result(
            model_pool=model_pool, models_used=models, error=exc.code, error_message=exc.message
        )

    prompt = build_prompt(labeling_guide, contexts_text, question_text, list(options_by_key.values()))

    model_results = [_ask_model(model, prompt, ask, options_by_key, secret) for model in models]
    votes = Counter(result["vote"] for result in model_results if result["vote"])

    return tiebreak_result(
        model_pool=model_pool, models_used=models, models=model_results, vote_count=votes
    )


@sensitive_variables("secret")
def _ask_model(model_name, prompt, ask, options_by_key, secret):
    try:
        raw_response = ask(model_name, prompt)
    except Exception as exc:
        return {
            "model": model_name,
            "status": "error",
            "vote": None,
            "error": _redact(str(exc), secret),
        }

    vote = parse_vote(raw_response, options_by_key)
    return {
        "model": model_name,
        "status": "ok" if vote else "invalid_vote",
        "vote": vote,
        "raw_response": str(raw_response).strip() if raw_response is not None else "",
    }


def _ollama_models_for(contexts):
    has_code_context = any(
        str((context or {}).get("context_type") or "").strip().lower() == "code"
        for context in (contexts or [])
    )
    if has_code_context:
        return OLLAMA_MODELS_CODE, "code"
    return OLLAMA_MODELS_GENERAL, "general"


def _winner_from_votes(vote_count):
    if not vote_count:
        return None, False
    max_votes = max(vote_count.values())
    top_options = [option for option, count in vote_count.items() if count == max_votes]
    if len(top_options) == 1:
        return top_options[0], False
    return None, True


def _redact(text, secret):
    if secret:
        text = text.replace(secret, "[REDACTED]")
    return text[:_MAX_ERROR_LENGTH]
