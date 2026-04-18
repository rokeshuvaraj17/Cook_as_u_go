from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime

class ItemResponse(BaseModel):
    id: int
    receipt_id: int
    raw_name: str
    normalized_name: Optional[str]
    category: Optional[str]
    price: float
    quantity: float
    estimated_expiration_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True

class ItemCreate(BaseModel):
    raw_name: str = Field(..., example="1pk Skim Milk")
    normalized_name: Optional[str] = Field(None, example="Milk")
    category: Optional[str] = Field(None, example="Dairy")
    price: float = Field(..., gt=0)
    quantity: float = Field(default=1.0, gt=0)
    estimated_expiration_date: Optional[date] = None
    receipt_id: int

class ItemUpdate(BaseModel):
    raw_name: str | None = None
    normalized_name: str | None = None
    category: str | None = None
    price: float | None = None
    quantity: float | None = None
    estimated_expiration_date: date | None = None
    
