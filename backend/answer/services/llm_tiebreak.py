import base64
import json
import os
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib import error, request


# TEMPORARIO (modelos leves para não travar local em desempate).
# pra reverter para o comportamento original, é só restaurar OLLAMA_MODELS_ORIGINAL.
OLLAMA_MODELS_ORIGINAL = [
    "qwen3-coder:30b",
    "devstral-small-2",
    "qwen2.5-coder:32b",
    "deepseek-coder-v2:16b",
    "qwen3-coder-next",
]

OLLAMA_MODELS = [
    "tinyllama:latest",
    "llama3.2:1b",
    "qwen2.5:0.5b",
]


VIDEO_CONTEXT_ERROR_CODE = "UNSUPPORTED_VIDEO_CONTEXT"
VIDEO_CONTEXT_ERROR_MESSAGE = (
    "Não foi possível fazer essa pergunta decisiva porque existe contexto do tipo "
    "'video' que a decisão por LLM não consegue rotular."
)


def _normalize_key(value):
    return str(value).strip().casefold()


def _is_http_url(value):
    text = str(value).strip().lower()
    return text.startswith("http://") or text.startswith("https://")


def _is_data_url(value):
    text = str(value).strip().lower()
    return text.startswith("data:image/")


def _looks_like_file_path(value):
    text = str(value).strip()
    if not text:
        return False
    if text.startswith("/") or text.startswith("./") or text.startswith("../"):
        return True
    return any(text.lower().endswith(ext) for ext in (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"))


def _looks_like_audio_reference(value):
    text = str(value).strip().lower()
    if not text:
        return False
    if _is_http_url(text) or text.startswith("/") or text.startswith("./") or text.startswith("../"):
        return True
    return any(text.endswith(ext) for ext in (".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"))


def _read_url_bytes(url, timeout_seconds):
    req = request.Request(url, method="GET")
    with request.urlopen(req, timeout=timeout_seconds) as resp:
        return resp.read()


def _read_image_bytes(image_value, timeout_seconds):
    if image_value is None:
        return None, "IMAGE_VALUE_EMPTY"

    raw = str(image_value).strip()
    if not raw:
        return None, "IMAGE_VALUE_EMPTY"

    if _is_data_url(raw):
        try:
            _, b64 = raw.split(",", 1)
            return base64.b64decode(b64), None
        except Exception:
            return None, "IMAGE_DATA_URL_INVALID"

    if _is_http_url(raw):
        try:
            return _read_url_bytes(raw, timeout_seconds), None
        except Exception as exc:
            return None, f"IMAGE_DOWNLOAD_ERROR: {exc}"

    if _looks_like_file_path(raw):
        path = Path(raw)
        if path.exists() and path.is_file():
            try:
                return path.read_bytes(), None
            except Exception as exc:
                return None, f"IMAGE_FILE_READ_ERROR: {exc}"
        return None, "IMAGE_FILE_NOT_FOUND"

    return None, "IMAGE_SOURCE_UNSUPPORTED"


def _call_ollama_chat(base_url, timeout_seconds, payload):
    req = request.Request(
        f"{base_url.rstrip('/')}/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with request.urlopen(req, timeout=timeout_seconds) as resp:
        raw = resp.read().decode("utf-8")
    return json.loads(raw)


def _describe_image_with_ollama(base_url, timeout_seconds, image_value):
    image_model = os.getenv("OLLAMA_IMAGE_CONTEXT_MODEL", "llava:7b")
    image_bytes, read_error = _read_image_bytes(image_value, timeout_seconds)
    if read_error:
        return None, read_error

    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    payload = {
        "model": image_model,
        "stream": False,
        "options": {"temperature": 0},
        "messages": [
            {
                "role": "user",
                "content": (
                    "Descreva objetivamente esta imagem para decisão de anotação. "
                    "Foque em sinais visuais úteis para classificar opções."
                ),
                "images": [image_b64],
            }
        ],
    }
    try:
        response = _call_ollama_chat(base_url, timeout_seconds, payload)
        description = (
            response.get("message", {}).get("content", "")
            if isinstance(response, dict)
            else ""
        )
        description = str(description).strip()
        if not description:
            return None, "IMAGE_DESCRIPTION_EMPTY"
        return description, None
    except Exception as exc:
        return None, f"IMAGE_DESCRIPTION_ERROR: {exc}"


def _extract_audio_transcript(value):
    if isinstance(value, dict):
        for key in ("transcript", "text", "content", "caption"):
            transcript = value.get(key)
            if transcript is not None and str(transcript).strip():
                return str(transcript).strip(), None

    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return None, "AUDIO_VALUE_EMPTY"
        if _looks_like_audio_reference(raw):
            return None, (
                "AUDIO_TRANSCRIPT_REQUIRED: contexto de áudio sem transcrição textual."
            )
        return raw, None

    if value is None:
        return None, "AUDIO_VALUE_EMPTY"

    return str(value), None


def _format_contexts_for_prompt(contexts, base_url, timeout_seconds):
    lines = []

    for idx, context in enumerate(contexts or [], start=1):
        context_type = str(context.get("context_type") or "text").strip().lower()
        label = (
            str(context.get("label") or context.get("column_name") or f"Contexto {idx}")
            .strip()
        )
        value = context.get("value")

        if context_type == "video":
            return None, {
                "error": VIDEO_CONTEXT_ERROR_CODE,
                "error_message": VIDEO_CONTEXT_ERROR_MESSAGE,
            }

        if context_type == "image":
            description, err = _describe_image_with_ollama(
                base_url=base_url,
                timeout_seconds=timeout_seconds,
                image_value=value,
            )
            if err:
                return None, {
                    "error": "IMAGE_CONTEXT_PROCESSING_ERROR",
                    "error_message": f"Não foi possível processar contexto de imagem ({label}): {err}",
                }
            lines.append(f"{idx}. {label} [image]\nDescrição: {description}")
            continue

        if context_type == "audio":
            transcript, err = _extract_audio_transcript(value)
            if err:
                return None, {
                    "error": "AUDIO_CONTEXT_PROCESSING_ERROR",
                    "error_message": f"Não foi possível processar contexto de áudio ({label}): {err}",
                }
            lines.append(f"{idx}. {label} [audio]\nTranscrição: {transcript}")
            continue

        if context_type == "code":
            code_text = "" if value is None else str(value)
            lines.append(f"{idx}. {label} [code]\n```text\n{code_text}\n```")
            continue

        text_value = "(sem valor)"
        if value is not None and str(value).strip():
            text_value = str(value).strip()
        lines.append(f"{idx}. {label} [{context_type}]\n{text_value}")

    return "\n\n".join(lines) if lines else "(sem contextos disponíveis)", None


def _parse_vote(raw_response, normalized_options):
    if raw_response is None:
        return None

    candidate = str(raw_response).strip()
    if not candidate:
        return None

    exact = normalized_options.get(_normalize_key(candidate))
    if exact:
        return exact

    try:
        parsed_json = json.loads(candidate)
    except (json.JSONDecodeError, TypeError):
        parsed_json = None

    if isinstance(parsed_json, dict):
        for key in ("answer", "option", "choice", "response"):
            if key in parsed_json:
                option = normalized_options.get(_normalize_key(parsed_json[key]))
                if option:
                    return option

    matches = []
    lowered = _normalize_key(candidate)
    for original in normalized_options.values():
        option_key = _normalize_key(original)
        if option_key and option_key in lowered:
            matches.append(original)

    if len(matches) == 1:
        return matches[0]

    return None


def _build_prompt(labeling_guide, contexts_text, question_text, options):
    options_text = "\n".join([f"- {option}" for option in options])

    return (
        "Você é um árbitro de desempate de anotação.\n"
        "Tarefa: escolher exatamente UMA opção da pergunta decisiva.\n"
        "Regras:\n"
        "1. Use somente o guia, contexto e pergunta fornecidos.\n"
        "2. Retorne APENAS o texto exato de uma opção da lista.\n"
        "3. Não explique, não adicione texto extra.\n\n"
        f"GUIA COMPLETO:\n{labeling_guide or '(sem guia)'}\n\n"
        f"CONTEXTO DO ITEM:\n{contexts_text}\n\n"
        f"PERGUNTA DECISIVA:\n{question_text or '(sem texto)'}\n\n"
        f"OPÇÕES VÁLIDAS:\n{options_text}\n"
    )


def _call_ollama_model(base_url, timeout_seconds, model_name, prompt):
    payload = {
        "model": model_name,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0},
    }
    req = request.Request(
        f"{base_url.rstrip('/')}/api/generate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with request.urlopen(req, timeout=timeout_seconds) as resp:
        raw = resp.read().decode("utf-8")
    parsed = json.loads(raw)
    return parsed.get("response")


def run_llm_tiebreak_decision(*, labeling_guide, question_text, options, contexts):
    normalized_options = {
        _normalize_key(option): option
        for option in options
        if str(option).strip()
    }
    valid_options = list(normalized_options.values())
    attempt_time = datetime.now(timezone.utc).isoformat()

    if not valid_options:
        return {
            "attempted_at": attempt_time,
            "models": [],
            "vote_count": {},
            "winner": None,
            "tied": False,
            "valid_votes": 0,
            "error": "NO_VALID_OPTIONS",
            "error_message": "Não há opções válidas para a pergunta decisiva.",
        }

    base_url = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
    timeout_seconds = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "60"))

    contexts_text, context_error = _format_contexts_for_prompt(
        contexts=contexts,
        base_url=base_url,
        timeout_seconds=timeout_seconds,
    )
    if context_error:
        return {
            "attempted_at": attempt_time,
            "models": [],
            "vote_count": {},
            "winner": None,
            "tied": False,
            "valid_votes": 0,
            "error": context_error["error"],
            "error_message": context_error["error_message"],
        }

    prompt = _build_prompt(labeling_guide, contexts_text, question_text, valid_options)

    model_results = []
    counter = Counter()

    for model_name in OLLAMA_MODELS:
        try:
            raw_response = _call_ollama_model(
                base_url=base_url,
                timeout_seconds=timeout_seconds,
                model_name=model_name,
                prompt=prompt,
            )
            vote = _parse_vote(raw_response, normalized_options)
            if vote:
                counter[vote] += 1
                model_results.append(
                    {
                        "model": model_name,
                        "status": "ok",
                        "vote": vote,
                        "raw_response": str(raw_response).strip(),
                    }
                )
            else:
                model_results.append(
                    {
                        "model": model_name,
                        "status": "invalid_vote",
                        "vote": None,
                        "raw_response": (
                            str(raw_response).strip() if raw_response is not None else ""
                        ),
                    }
                )
        except Exception as exc:
            model_results.append(
                {
                    "model": model_name,
                    "status": "error",
                    "vote": None,
                    "error": str(exc),
                }
            )

    winner = None
    tied = False
    if counter:
        max_votes = max(counter.values())
        top_options = [option for option, count in counter.items() if count == max_votes]
        if len(top_options) == 1:
            winner = top_options[0]
        else:
            tied = True

    return {
        "attempted_at": attempt_time,
        "models": model_results,
        "vote_count": dict(counter),
        "winner": winner,
        "tied": tied,
        "valid_votes": sum(counter.values()),
        "error": None,
        "error_message": None,
    }
