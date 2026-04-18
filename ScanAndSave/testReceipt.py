import sys
import json
from pipeline.receipt_pipeline import ReceiptPipeline


def main():
    if len(sys.argv) < 2:
        print("Usage: python main.py <receipt_image>")
        return

    pipeline = ReceiptPipeline()
    result = pipeline.run(sys.argv[1])

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()