import json
from .base_agent import BaseAgent


class GroceryClassificationAgent(BaseAgent):
    def __init__(self):
        schema = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "normalized_name": {"type": "string"},
                    "category": {
                        "type": "string",
                        "enum": [
                            "Produce",
                            "Dairy",
                            "Meat & Seafood",
                            "Bakery",
                            "Frozen",
                            "Pantry",
                            "Snacks",
                            "Beverages",
                            "Household",
                            "Personal Care",
                            "Other"
                        ]
                    },
                    "subcategory": {"type": "string"},
                    "confidence": {"type": "number"}
                },
                "required": ["normalized_name", "category"]
            }
        }

        super().__init__(schema)

    def run(self, items: list):
        prompt = """
        Classify each grocery item into:
        Produce, Dairy, Meat & Seafood, Bakery,
        Frozen, Pantry, Snacks, Beverages,
        Household, Personal Care, or Other.

        Also include subcategory.
        Return JSON only.
        """

        text = "\n".join([item["normalized_name"] for item in items])

        result = self.generate([prompt, text])
        return json.loads(result)