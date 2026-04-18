import json
from PIL import Image
from .base_agent import BaseAgent


class ReceiptExtractionAgent(BaseAgent):
    def __init__(self):
        schema = {
            "type": "object",
            "properties": {
                "merchant": {"type": "string"},
                "date": {"type": "string"},
                "time": {"type": "string"},
                "location_text": {"type": "string"},
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "raw_name": {"type": "string"},
                            "quantity": {"type": "number"},
                            "unit": {"type": "string"},
                            "price": {"type": "number"},
                        },
                        "required": ["raw_name", "price"],
                    },
                },
                "subtotal": {"type": "number"},
                "tax": {"type": "number"},
                "total": {"type": "number"},
            },
            "required": ["merchant", "items", "total"],
        }

        super().__init__(schema)

    def run(self, image_path: str):
        image = Image.open(image_path)

        prompt = """
        Extract grocery receipt data. Return JSON only.

        merchant: store name as printed.
        date: transaction date as on the receipt (any clear format).
        time: store hours/time if printed separately (e.g. 2:34 PM or 14:34). Omit if not visible.
        location_text: store address or city line if visible, else omit.

        items: one object per line item.
        - raw_name: product description exactly as printed (include size text if present).
        - quantity: numeric amount purchased. For weighted produce (tomatoes, onions, bananas by weight),
          use the WEIGHT number (e.g. 2.31), not 1. For multi-pack counts (x6), use pack count.
          If only a single price line with no weight, use 1.
        - unit: one of: g, kg, lb, oz, ml, L, pcs, pack, bag, bowl, tub, container, loaf
          Use lb or kg for items sold by weight (look for "lb", "LB", "KG", "@/lb", "per kg").
          Use pcs for each/count items.
        - price: UNIT price (price per lb, per kg, or per piece) as printed, NOT the line extended total
          when the receipt shows "@ $1.99/lb" style. If only extended total is visible, put that total
          in price and set quantity to 1 and unit to pcs (user can fix later).

        subtotal, tax, total: numeric when visible.
        """

        result = self.generate([prompt, image])
        return json.loads(result)