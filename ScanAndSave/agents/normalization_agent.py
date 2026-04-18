import json
from .base_agent import BaseAgent


class ItemNormalizationAgent(BaseAgent):
    def __init__(self):
        schema = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "raw_name": {"type": "string"},
                    "normalized_name": {"type": "string"},
                    "confidence": {"type": "number"}
                },
                "required": ["raw_name", "normalized_name"]
            }
        }

        super().__init__(schema)

    def run(self, merchant: str, items: list):
        prompt = f"""
        Merchant: {merchant}

        Expand grocery abbreviations into full readable product names.
        Return JSON only.
        """

        raw_text = "\n".join([item["raw_name"] for item in items])

        result = self.generate([prompt, raw_text])
        return json.loads(result)