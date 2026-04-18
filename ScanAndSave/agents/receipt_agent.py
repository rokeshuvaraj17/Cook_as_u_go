import json
import sys
from ScanAndSave.pipeline.receipt_pipeline import ReceiptPipeline


# ==========================================================
# CLI Entry
# ==========================================================
def main():
    if len(sys.argv) < 2:
        print("Usage: python -m ScanAndSave.agents.receipt_agent <receipt_image>")
        sys.exit(1)

    image_path = sys.argv[1]

    pipeline = ReceiptPipeline()

    try:
        result = pipeline.run(image_path)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print("Error:", str(e))


if __name__ == "__main__":
    main()