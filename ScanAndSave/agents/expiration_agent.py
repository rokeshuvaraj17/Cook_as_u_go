import json
from .base_agent import BaseAgent


class ExpirationEstimationAgent(BaseAgent):
    def __init__(self):
        schema = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "normalized_name": {"type": "string"},
                    "shelf_life_days": {"type": "number"},
                    "storage_recommendation": {"type": "string"},
                    "confidence": {"type": "number"}
                },
                "required": ["normalized_name", "shelf_life_days"]
            }
        }

        super().__init__(schema)

    def run(self, items: list):
        prompt = """
        Estimate realistic shelf life in days for each food item.
        Assume typical household storage.

        Provide:
        - shelf_life_days
        - storage_recommendation
        - confidence (0-1)

        Return JSON only.
        """

        text = "\n".join(
            [f"{item['normalized_name']} ({item['category']})"
             for item in items
             if item["category"] not in ["Household", "Personal Care"]]
        )

        result = self.generate([prompt, text])
        return json.loads(result)