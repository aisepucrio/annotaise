"""Criptografia (AES-256-GCM) das chaves de API guardadas em labeling.AICredential."""

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

_NONCE_SIZE = 12
_KEY_SIZE = 32


def _load_key() -> bytes:
    raw = getattr(settings, "AI_BYOK_ENCRYPTION_KEY", None)
    if not raw:
        raise ImproperlyConfigured("AI_BYOK_ENCRYPTION_KEY não configurada.")
    try:
        key = base64.b64decode(raw, validate=True)
    except Exception as exc:
        raise ImproperlyConfigured("AI_BYOK_ENCRYPTION_KEY inválida (esperado base64).") from exc
    if len(key) != _KEY_SIZE:
        raise ImproperlyConfigured("AI_BYOK_ENCRYPTION_KEY deve decodificar para 32 bytes (AES-256).")
    return key


def encrypt_secret(plaintext: str) -> str:
    key = _load_key()
    nonce = os.urandom(_NONCE_SIZE)
    ciphertext = AESGCM(key).encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ciphertext).decode("ascii")


def decrypt_secret(token: str) -> str:
    key = _load_key()
    raw = base64.b64decode(token)
    nonce, ciphertext = raw[:_NONCE_SIZE], raw[_NONCE_SIZE:]
    return AESGCM(key).decrypt(nonce, ciphertext, None).decode("utf-8")
