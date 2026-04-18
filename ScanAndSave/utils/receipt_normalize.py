"""
Normalize LLM receipt extraction: datetime for APIs, line quantities and mass units.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Optional

# Pantry / bill units accepted by the kitchen backend (see kitchenRepository ALLOWED_UNITS)
_CANON_UNITS = {
    "g": "g",
    "gr": "g",
    "gm": "g",
    "gram": "g",
    "grams": "g",
    "kg": "kg",
    "kgs": "kg",
    "kilogram": "kg",
    "kilograms": "kg",
    "lb": "lb",
    "lbs": "lb",
    "lb.": "lb",
    "#": "lb",
    "pound": "lb",
    "pounds": "lb",
    "ml": "ml",
    "l": "L",
    "liter": "L",
    "litre": "L",
    "liters": "L",
    "litres": "L",
    "pcs": "pcs",
    "pc": "pcs",
    "ea": "pcs",
    "each": "pcs",
    "ct": "pcs",
    "count": "pcs",
    "pack": "pack",
    "bag": "bag",
    "bowl": "bowl",
    "tub": "tub",
    "container": "container",
    "loaf": "loaf",
}


def canonicalize_unit(raw: Any) -> str:
    if raw is None:
        return "pcs"
    s = str(raw).strip().lower().replace(".", "")
    if not s:
        return "pcs"
    if s in ("oz", "ounce", "ounces"):
        return "oz"
    if s in _CANON_UNITS:
        return _CANON_UNITS[s]
    if s.endswith("s") and s[:-1] in _CANON_UNITS:
        return _CANON_UNITS[s[:-1]]
    return "pcs"


def _to_float(x: Any, default: float = 1.0) -> float:
    if x is None:
        return default
    try:
        n = float(x)
        if n <= 0:
            return default
        return n
    except (TypeError, ValueError):
        return default


def _oz_to_g(oz: float) -> tuple[float, str]:
    return round(oz * 28.3495, 1), "g"


def coerce_line_item(item: dict[str, Any]) -> dict[str, Any]:
    """Ensure quantity, unit, price; convert oz to g for pantry (backend has no oz)."""
    out = dict(item)
    raw_name = str(out.get("raw_name") or out.get("name") or "Item").strip() or "Item"
    out["raw_name"] = raw_name

    qty = _to_float(out.get("quantity"), 1.0)
    unit = canonicalize_unit(out.get("unit"))

    price = out.get("price")
    try:
        price_f = float(price) if price is not None else None
    except (TypeError, ValueError):
        price_f = None

    if unit == "oz":
        qty, unit = _oz_to_g(qty)

    out["quantity"] = qty
    out["unit"] = unit
    out["price"] = price_f

    if price_f is not None and out.get("line_subtotal") is None:
        out["line_subtotal"] = round(price_f * qty, 2)

    return out


def coerce_line_items(items: list[Any]) -> list[dict[str, Any]]:
    if not items:
        return []
    return [coerce_line_item(x) if isinstance(x, dict) else coerce_line_item({"raw_name": str(x)}) for x in items]


def normalize_receipt_datetime(date_val: Any, time_val: Any = None) -> Optional[str]:
    """
    Return ISO-8601 string (often with time) for JavaScript Date and Postgres.
    """
    if date_val is None and time_val is None:
        return None

    s = str(date_val).strip() if date_val is not None else ""
    t_extra = str(time_val).strip() if time_val is not None else ""

    if not s and t_extra:
        s = datetime.now().strftime("%Y-%m-%d")

    # Strip common wrappers
    s = s.replace("Z", "+00:00")

    # Try Python isoformat (handles 2025-04-07T14:32:00)
    try:
        dt = datetime.fromisoformat(s)
        return dt.isoformat()
    except ValueError:
        pass

    # Date-only in first token
    date_part = s.split("T")[0].split(" ")[0]
    time_part = None
    if "T" in s:
        rest = s.split("T", 1)[1]
        time_part = rest.split("+")[0].split("-")[0] if rest else None
    elif len(s) > 12 and " " in s:
        parts = s.split()
        if len(parts) >= 2:
            date_part = parts[0]
            time_part = " ".join(parts[1:])

    if not time_part and t_extra:
        time_part = t_extra

    dt = None
    date_formats = (
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%m/%d/%y",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%m-%d-%Y",
        "%m-%d-%y",
        "%d.%m.%Y",
        "%Y/%m/%d",
        "%b %d, %Y",
        "%B %d, %Y",
        "%b %d %Y",
        "%d %b %Y",
        "%d %B %Y",
    )
    for fmt in date_formats:
        try:
            dt = datetime.strptime(date_part[: len(date_part)].strip(), fmt)
            break
        except ValueError:
            continue

    if dt is None:
        m = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", s)
        if m:
            a, b, y = m.group(1), m.group(2), m.group(3)
            yi = int(y) + (2000 if len(y) == 2 else 0) if len(y) == 2 else int(y)
            try:
                dt = datetime(yi, int(a), int(b))
            except ValueError:
                try:
                    dt = datetime(yi, int(b), int(a))
                except ValueError:
                    dt = None

    if dt is None:
        return None

    if time_part:
        tp = time_part.strip()
        parsed_t = None
        for tf in ("%H:%M:%S", "%H:%M"):
            try:
                parsed_t = datetime.strptime(tp[:8] if len(tp) >= 8 else tp, tf)
                break
            except ValueError:
                continue
        if parsed_t is None:
            for tf in ("%I:%M %p", "%I:%M%p"):
                try:
                    parsed_t = datetime.strptime(tp.replace(".", ""), tf)
                    break
                except ValueError:
                    continue
        if parsed_t is not None:
            dt = dt.replace(
                hour=parsed_t.hour,
                minute=parsed_t.minute,
                second=parsed_t.second if hasattr(parsed_t, "second") else 0,
            )

    return dt.isoformat()


def normalize_extracted_receipt(receipt: dict[str, Any]) -> dict[str, Any]:
    """Apply all coercions to a pipeline receipt dict (mutates copy)."""
    out = dict(receipt)
    merged = normalize_receipt_datetime(out.get("date"), out.get("time"))
    if merged:
        out["date"] = merged
    if "time" in out:
        del out["time"]
    out["items"] = coerce_line_items(list(out.get("items") or []))
    return out
