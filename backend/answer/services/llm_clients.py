import json
import os
from urllib import request

PROVIDER_MODEL_MAP = {
    "openai": "openai/gpt-4o-mini",
    "anthropic": "anthropic/claude-3-5-haiku-20241022",
    "gemini": "gemini/gemini-1.5-flash",
}


def ollama_base_url():
    return os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")


def ollama_timeout_seconds():
    return float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "60"))


def _byok_timeout_seconds():
    return float(os.getenv("BYOK_LLM_TIMEOUT_SECONDS", "60"))


def _post_ollama(path, payload):
    req = request.Request(
        f"{ollama_base_url().rstrip('/')}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with request.urlopen(req, timeout=ollama_timeout_seconds()) as resp:
        return json.loads(resp.read().decode("utf-8"))


def ollama_generate(model_name, prompt):
    response = _post_ollama(
        "/api/generate",
        {
            "model": model_name,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0},
        },
    )
    return response.get("response")


def ollama_describe_image(image_b64, instruction):
    response = _post_ollama(
        "/api/chat",
        {
            "model": os.getenv("OLLAMA_IMAGE_CONTEXT_MODEL", "llava:7b"),
            "stream": False,
            "options": {"temperature": 0},
            "messages": [
                {"role": "user", "content": instruction, "images": [image_b64]}
            ],
        },
    )
    if not isinstance(response, dict):
        return ""
    return str(response.get("message", {}).get("content", "")).strip()


def cloud_completion(model_name, api_key, prompt):
    import litellm

    response = litellm.completion(
        model=model_name,
        api_key=api_key,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        timeout=_byok_timeout_seconds(),
    )
    return response.choices[0].message.content


def http_get_bytes(url):
    req = request.Request(url, method="GET")
    with request.urlopen(req, timeout=ollama_timeout_seconds()) as resp:
        return resp.read()
