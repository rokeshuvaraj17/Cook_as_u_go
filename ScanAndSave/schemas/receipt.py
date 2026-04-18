from pydantic import BaseModel, Field
from datetime import date
from decimal import Decimal
from ScanAndSave.schemas.item import ItemResponse

class ReceiptBase(BaseModel):
    store: str
    purchase_date: date
    total_amount: Decimal

class ReceiptCreate(ReceiptBase):
    pass

class ReceiptUpdate(BaseModel):
    store: str | None = None
    purchase_date: date | None = None
    total_amount: Decimal | None = None

class ReceiptResponse(ReceiptBase):
    receipt_id: int
    user_id: int

    class Config:
        from_attributes = True

class ReceiptWithItemsResponse(ReceiptResponse):
    items: list[ItemResponse] = Field(default_factory=list)