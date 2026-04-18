from datetime import timedelta
from ScanAndSave.utils.date_utils import parse_date, to_iso_string


class ExpirationService:
    @staticmethod
    def apply_expiration(items: list, expiration_estimates: list, purchase_date: str):
        purchase_dt = parse_date(purchase_date)

        lookup = {e["normalized_name"]: e for e in expiration_estimates}

        for item in items:
            norm = item.get("normalized_name")
            if norm in lookup:
                estimate = lookup[norm]
                shelf_days = int(estimate["shelf_life_days"])

                expiration_dt = purchase_dt + timedelta(days=shelf_days)

                item["shelf_life_days"] = shelf_days
                item["estimated_expiration_date"] = to_iso_string(expiration_dt)
                item["storage_recommendation"] = estimate.get("storage_recommendation")
                item["expiration_confidence"] = estimate.get("confidence")

        return items