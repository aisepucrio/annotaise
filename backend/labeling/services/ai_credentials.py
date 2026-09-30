"""Escrita das credenciais de IA e do vínculo delas com a rotulação.

O segredo só é cifrado aqui: nem view nem serializer tocam em `encrypt_secret`
ou em `encrypted_api_key`.
"""

from django.db import transaction

from annotaise.crypto import encrypt_secret
from labeling.models import AICredential

# Últimos caracteres guardados em claro só para a tela identificar a chave.
KEY_HINT_LENGTH = 4


@transaction.atomic
def create_ai_credential(*, owner, name, provider, api_key) -> AICredential:
    """Cadastra uma chave na biblioteca do usuário."""
    return AICredential.objects.create(
        owner=owner,
        name=name,
        provider=provider,
        encrypted_api_key=encrypt_secret(api_key),
        key_hint=api_key[-KEY_HINT_LENGTH:],
    )


@transaction.atomic
def update_ai_credential(*, credential, name=None, provider=None, api_key=None) -> AICredential:
    """Renomeia, troca de provedor e/ou substitui a chave de uma credencial.

    `api_key=None` mantém o segredo atual: dá para renomear sem recolar a chave.
    """
    fields = []

    if name is not None:
        credential.name = name
        fields.append("name")
    if provider is not None:
        credential.provider = provider
        fields.append("provider")
    if api_key:
        credential.encrypted_api_key = encrypt_secret(api_key)
        credential.key_hint = api_key[-KEY_HINT_LENGTH:]
        fields.extend(["encrypted_api_key", "key_hint"])

    if fields:
        credential.save(update_fields=[*fields, "updated_at"])
    return credential


@transaction.atomic
def link_ai_credential(*, labeling, credential):
    """Aponta a rotulação para uma credencial. `credential=None` desvincula.

    Desvincular não apaga a credencial — ela pode estar em uso por outras
    rotulações — e a rotulação volta ao desempate padrão (Ollama local).
    """
    labeling.ai_credential = credential
    labeling.save(update_fields=["ai_credential"])
    return labeling
