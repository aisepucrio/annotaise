"""Chave de IA que o usuário manda na própria requisição (modo "só nesta sessão").

Quem não quer guardar a chave no servidor a envia no header X-User-LLM-Key nas
requisições que podem disparar o desempate por LLM. A chave vale só para aquela
requisição: nada aqui grava, cacheia ou registra o valor. Sem o header, o
desempate cai no caminho da chave salva (labeling.AICredential).

Duas defesas para ela não aparecer em log:

* `pop_user_llm_key` remove o header de request.META no momento do uso, então
  daí em diante não sobra de onde um traceback, middleware ou APM possa lê-la;
* `UserLlmKeyReporterFilter` cobre a janela anterior a esse pop, quando uma
  exceção despejaria o META inteiro na página de debug ou no e-mail a ADMINS.
  O filtro padrão do Django já esconderia o header pelo regex /KEY/i, mas isso
  amarraria a proteção ao nome dele.
"""

from django.views.debug import SafeExceptionReporterFilter

# Nomes como o cliente envia (o frontend importa os mesmos de lib/userLlmKey.ts).
USER_LLM_KEY_HEADER = "X-User-LLM-Key"
USER_LLM_PROVIDER_HEADER = "X-User-LLM-Provider"

# Nomes como o Django os expõe em request.META.
KEY_META = "HTTP_X_USER_LLM_KEY"
PROVIDER_META = "HTTP_X_USER_LLM_PROVIDER"


def pop_user_llm_key(request):
    """Retira a chave da requisição e devolve `(provider, api_key)`.

    Devolve `(None, None)` quando o header não veio. O valor retornado é a
    única cópia que continua existindo, e some com a variável local do chamador.
    """
    # DRF embrulha o HttpRequest; o META que interessa é o do objeto de baixo.
    http_request = getattr(request, "_request", request)
    meta = getattr(http_request, "META", None)
    if meta is None:
        return None, None

    api_key = (meta.pop(KEY_META, "") or "").strip()
    provider = (meta.pop(PROVIDER_META, "") or "").strip().lower()

    # request.headers é um cached_property montado a partir do META: se alguém
    # já o acessou nesta requisição, a cópia dele ainda guarda o valor antigo.
    http_request.__dict__.pop("headers", None)

    if not api_key:
        return None, None
    return provider or None, api_key


class UserLlmKeyReporterFilter(SafeExceptionReporterFilter):
    """Esconde o header no relatório de exceção do Django."""

    def get_safe_request_meta(self, request):
        meta = super().get_safe_request_meta(request)
        if KEY_META in meta:
            meta[KEY_META] = self.cleansed_substitute
        return meta
