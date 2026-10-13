USER_LLM_KEY_HEADER = "X-User-LLM-Key"
USER_LLM_PROVIDER_HEADER = "X-User-LLM-Provider"

KEY_META = "HTTP_X_USER_LLM_KEY"
PROVIDER_META = "HTTP_X_USER_LLM_PROVIDER"


def pop_user_llm_key(request):
    """Tira a chave do request e devolve (provider, api_key), ou (None, None)."""
    http_request = getattr(request, "_request", request)

    api_key = (http_request.META.pop(KEY_META, "") or "").strip()
    provider = (http_request.META.pop(PROVIDER_META, "") or "").strip().lower()

    # request.headers é cacheado a partir do META; sem isso a chave continuaria lá.
    http_request.__dict__.pop("headers", None)

    if not api_key:
        return None, None
    return provider or None, api_key
