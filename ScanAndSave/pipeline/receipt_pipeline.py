from ScanAndSave.agents.extraction_agent import ReceiptExtractionAgent
from ScanAndSave.agents.normalization_agent import ItemNormalizationAgent
from ScanAndSave.agents.classification_agent import GroceryClassificationAgent
from ScanAndSave.agents.expiration_agent import ExpirationEstimationAgent

from ScanAndSave.services.expiration_service import ExpirationService
from ScanAndSave.utils.receipt_normalize import normalize_extracted_receipt


class ReceiptPipeline:
    def __init__(self):
        self.extractor = ReceiptExtractionAgent()
        self.normalizer = ItemNormalizationAgent()
        self.classifier = GroceryClassificationAgent()
        self.expiration_agent = ExpirationEstimationAgent()

    def run(self, image_path: str):
        # Extract
        receipt = self.extractor.run(image_path)
        receipt = normalize_extracted_receipt(receipt)

        # Normalize names
        normalized = self.normalizer.run(
            receipt["merchant"],
            receipt["items"]
        )
        norm_lookup = {n["raw_name"]: n for n in normalized}

        for item in receipt["items"]:
            item["normalized_name"] = norm_lookup.get(
                item["raw_name"], {}
            ).get("normalized_name", item["raw_name"])

        # Classify
        classified = self.classifier.run(receipt["items"])
        class_lookup = {c["normalized_name"]: c for c in classified}

        for item in receipt["items"]:
            item["category"] = class_lookup.get(
                item["normalized_name"], {}
            ).get("category", "Other")

        # Expiration estimation (LLM)
        expiration_estimates = self.expiration_agent.run(receipt["items"])

        # Expiration calculation (Service layer)
        receipt["items"] = ExpirationService.apply_expiration(
            receipt["items"],
            expiration_estimates,
            receipt.get("date")
        )

        return receipt