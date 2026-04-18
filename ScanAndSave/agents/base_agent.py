import base64
import io
import json
import time

import requests
from PIL import Image

from ScanAndSave.config import (
    MODEL_NAME,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    OPENROUTER_FALLBACK_MODEL,
    OPENROUTER_MAX_TOKENS,
)


class BaseAgent:
    def __init__(self, schema):
        self.model = MODEL_NAME
        self.response_schema = schema

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

        response = requests.post(
            f"{OPENROUTER_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=90,
        )
        return response

    def generate(self, inputs):
        response = self._request_completion(self.model, inputs)
        if response.status_code == 402 and OPENROUTER_FALLBACK_MODEL != self.model:
            # Retry with a fallback model when paid model credits are exhausted.
            response = self._request_completion(OPENROUTER_FALLBACK_MODEL, inputs)

        # Handle transient provider failures from OpenRouter.
        if response.status_code in (429, 500, 502, 503, 504):
            for delay_s in (1.0, 2.0):
                time.sleep(delay_s)
                retry = self._request_completion(self.model, inputs)
                if retry.ok:
                    response = retry
                    break
                if retry.status_code == 402 and OPENROUTER_FALLBACK_MODEL != self.model:
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