from datetime import date
from typing import Optional
from pydantic import BaseModel, Field


class InventoryResponse(BaseModel):
    id: int
    item_id: int
    user_id: int
    name: str
    category: Optional[str]
    quantity: float
    estimated_expiration_date: Optional[date]

    class Config:
        from_attributes = True


class InventoryCreate(BaseModel):
    item_id: int
    user_id: int
    name: str
    category: Optional[str]
    quantity: float
    estimated_expiration_date: Optional[date]


class InventoryDecrementRequest(BaseModel):
    amount: float = Field(default=1.0, gt=0)