import base64
import io
import json
import time

import requests
from PIL import Image

from ScanAndSave.config import (
    MODEL_NAME,
    OPENROUTER_API_KEY,
    OPENROUTER_APP_TITLE,
    OPENROUTER_BASE_URL,
    OPENROUTER_FALLBACK_MODEL,
    OPENROUTER_HTTP_REFERER,
    OPENROUTER_MAX_TOKENS,
)
from ScanAndSave.llm_context import get_llm


class BaseAgent:
    def __init__(self, schema):
        self.model = MODEL_NAME
        self.response_schema = schema

    def _effective_llm(self):
        ctx = get_llm()
        api_key = (ctx or {}).get("api_key") or OPENROUTER_API_KEY
        base_url = (ctx or {}).get("base_url") or OPENROUTER_BASE_URL
        model_override = (ctx or {}).get("model")
        return {
            "api_key": api_key,
            "base_url": str(base_url).rstrip("/"),
            "model": model_override,
        }

    @staticmethod
    def _image_to_data_url(image: Image.Image) -> str:
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGB")
        # Reduce payload size for better provider reliability on receipt photos.
        image.thumbnail((1600, 1600))
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=78, optimize=True)
        encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return f"data:image/jpeg;base64,{encoded}"

    def _build_user_content(self, inputs):
        if isinstance(inputs, str):
            inputs = [inputs]

        content = []
        for item in inputs:
            if isinstance(item, str):
                content.append({"type": "text", "text": item})
            elif isinstance(item, Image.Image):
                content.append(
                    {
                        "type": "image_url",
                        "image_url": {"url": self._image_to_data_url(item)},
                    }
                )
            else:
                content.append({"type": "text", "text": str(item)})
        return content

    def _request_completion(self, model: str, inputs):
        creds = self._effective_llm()
        if not creds.get("api_key"):
            raise RuntimeError(
                "No LLM API key configured. Use the app receipt flow (kitchen API proxy) or set X-LLM-Api-Key."
            )
        system_prompt = (
            "You are a strict JSON API. "
            "Return valid JSON only, no markdown fences, no commentary. "
            "Follow this JSON schema exactly:\n"
            f"{json.dumps(self.response_schema)}"
        )

        payload = {
            "model": model,
            "max_tokens": OPENROUTER_MAX_TOKENS,
            "temperature": 0,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": self._build_user_content(inputs)},
            ],
        }

        url = f"{creds['base_url']}/chat/completions"
        headers = {
            "Authorization": f"Bearer {creds['api_key']}",
            "Content-Type": "application/json",
        }
        if OPENROUTER_HTTP_REFERER:
            headers["HTTP-Referer"] = OPENROUTER_HTTP_REFERER
            headers["X-OpenRouter-Title"] = OPENROUTER_APP_TITLE
        response = requests.post(url, headers=headers, json=payload, timeout=90)
        return response

    def generate(self, inputs):
        creds = self._effective_llm()
        primary_model = creds["model"] or self.model
        response = self._request_completion(primary_model, inputs)
        if response.status_code == 402 and OPENROUTER_FALLBACK_MODEL != primary_model:
            # Retry with a fallback model when paid model credits are exhausted.
            response = self._request_completion(OPENROUTER_FALLBACK_MODEL, inputs)
        # Free router when primary + fallback still cannot bill (402) or fallback slug is gone (404).
        if not response.ok and response.status_code in (402, 404):
            free_router = "openrouter/free"
            if free_router not in (primary_model, OPENROUTER_FALLBACK_MODEL):
                alt = self._request_completion(free_router, inputs)
                if alt.ok:
                    response = alt

        # Handle transient provider failures from OpenRouter.
        if response.status_code in (429, 500, 502, 503, 504):
            for delay_s in (1.0, 2.0):
                time.sleep(delay_s)
                retry = self._request_completion(primary_model, inputs)
                if retry.ok:
                    response = retry
                    break
                if retry.status_code == 402 and OPENROUTER_FALLBACK_MODEL != primary_model:
                    retry_fb = self._request_completion(OPENROUTER_FALLBACK_MODEL, inputs)
                    if retry_fb.ok:
                        response = retry_fb
                        break
                response = retry
        response.raise_for_status()

        data = response.json()
        text = data["choices"][0]["message"]["content"]
        if not isinstance(text, str):
            text = json.dumps(text)

        # Guard against providers returning fenced JSON despite instructions.
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            cleaned = cleaned.replace("json\n", "", 1).strip()
        return cleaned