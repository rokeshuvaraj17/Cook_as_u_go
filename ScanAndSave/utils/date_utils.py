from datetime import datetime

from ScanAndSave.utils.receipt_normalize import normalize_receipt_datetime


def parse_date(date_string: str):
    if not date_string:
        return datetime.today()
    text = str(date_string).strip()
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        pass
    merged = normalize_receipt_datetime(text, None)
    if merged:
        try:
            return datetime.fromisoformat(merged.replace("Z", "+00:00"))
        except ValueError:
            pass
    date_part = text.split("T")[0].split(" ")[0]
    formats = [
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%m/%d/%y",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%B %d, %Y",
        "%b %d, %Y",
        "%d-%m-%Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_part, fmt)
        except ValueError:
            continue

    return datetime.today()


def to_iso_string(dt: datetime):
    return dt.strftime("%Y-%m-%d")