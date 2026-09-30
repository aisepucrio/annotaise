import base64
import json
from pathlib import Path

from . import llm_clients


class UnsupportedContext(Exception):

    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


IMAGE_DESCRIPTION_INSTRUCTION = (
    "Descreva objetivamente esta imagem para decisão de anotação. "
    "Foque em sinais visuais úteis para classificar opções."
)

_UNSUPPORTED_CONTEXT_TYPES = {
    "video": (
        "UNSUPPORTED_VIDEO_CONTEXT",
        "Não foi possível fazer essa pergunta decisiva porque existe contexto do tipo "
        "'video' que a decisão por LLM não consegue rotular.",
    ),
    "audio": (
        "UNSUPPORTED_AUDIO_CONTEXT",
        "Não foi possível fazer essa pergunta decisiva porque existe contexto do tipo "
        "'audio' que a decisão por LLM não consegue rotular.",
    ),
}

_IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp")


def normalize_option(value):
    return str(value).strip().casefold()


def normalized_options(options):
    return {normalize_option(option): option for option in options if str(option).strip()}


def build_prompt(labeling_guide, contexts_text, question_text, options):
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


def format_contexts(contexts):
    lines = []

    for idx, context in enumerate(contexts or [], start=1):
        context_type = str(context.get("context_type") or "text").strip().lower()
        label = str(context.get("label") or context.get("column_name") or f"Contexto {idx}").strip()
        value = context.get("value")

        if context_type in _UNSUPPORTED_CONTEXT_TYPES:
            raise UnsupportedContext(*_UNSUPPORTED_CONTEXT_TYPES[context_type])

        if context_type == "image":
            description, err = _describe_image(value)
            if err:
                raise UnsupportedContext(
                    "IMAGE_CONTEXT_PROCESSING_ERROR",
                    f"Não foi possível processar contexto de imagem ({label}): {err}",
                )
            lines.append(f"{idx}. {label} [image]\nDescrição: {description}")
        elif context_type == "code":
            code_text = "" if value is None else str(value)
            lines.append(f"{idx}. {label} [code]\n```text\n{code_text}\n```")
        else:
            text_value = str(value).strip() if value is not None and str(value).strip() else "(sem valor)"
            lines.append(f"{idx}. {label} [{context_type}]\n{text_value}")

    return "\n\n".join(lines) if lines else "(sem contextos disponíveis)"


def parse_vote(raw_response, options_by_key):
    """Qual opção o modelo escolheu, ou `None` se a resposta não for clara.

    Aceita o texto exato da opção, um JSON com `answer`/`option`/`choice`/
    `response`, ou um texto que mencione uma única opção.
    """
    if raw_response is None:
        return None

    candidate = str(raw_response).strip()
    if not candidate:
        return None

    exact = options_by_key.get(normalize_option(candidate))
    if exact:
        return exact

    try:
        parsed_json = json.loads(candidate)
    except (json.JSONDecodeError, TypeError):
        parsed_json = None

    if isinstance(parsed_json, dict):
        for key in ("answer", "option", "choice", "response"):
            if key in parsed_json:
                option = options_by_key.get(normalize_option(parsed_json[key]))
                if option:
                    return option

    lowered = normalize_option(candidate)
    matches = [
        original
        for original in options_by_key.values()
        if normalize_option(original) and normalize_option(original) in lowered
    ]
    return matches[0] if len(matches) == 1 else None


def _describe_image(image_value):
    image_bytes, read_error = _read_image_bytes(image_value)
    if read_error:
        return None, read_error

    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    try:
        description = llm_clients.ollama_describe_image(image_b64, IMAGE_DESCRIPTION_INSTRUCTION)
    except Exception as exc:
        return None, f"IMAGE_DESCRIPTION_ERROR: {exc}"
    if not description:
        return None, "IMAGE_DESCRIPTION_EMPTY"
    return description, None


def _read_image_bytes(image_value):
    raw = "" if image_value is None else str(image_value).strip()
    if not raw:
        return None, "IMAGE_VALUE_EMPTY"

    lowered = raw.lower()

    if lowered.startswith("data:image/"):
        try:
            _, b64 = raw.split(",", 1)
            return base64.b64decode(b64), None
        except Exception:
            return None, "IMAGE_DATA_URL_INVALID"

    if lowered.startswith(("http://", "https://")):
        try:
            return llm_clients.http_get_bytes(raw), None
        except Exception as exc:
            return None, f"IMAGE_DOWNLOAD_ERROR: {exc}"

    if raw.startswith(("/", "./", "../")) or lowered.endswith(_IMAGE_EXTENSIONS):
        path = Path(raw)
        if not path.is_file():
            return None, "IMAGE_FILE_NOT_FOUND"
        try:
            return path.read_bytes(), None
        except Exception as exc:
            return None, f"IMAGE_FILE_READ_ERROR: {exc}"

    return None, "IMAGE_SOURCE_UNSUPPORTED"
