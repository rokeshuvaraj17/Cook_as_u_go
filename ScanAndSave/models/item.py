from sqlalchemy import Column, Integer, String, ForeignKey, Text, Numeric, Date, TIMESTAMP
from sqlalchemy.sql import func
from ScanAndSave.database.session import Base
from sqlalchemy.orm import relationship


class Item(Base):
    __tablename__ = "items"

    receipt = relationship("Receipt", back_populates="items")
    id = Column(Integer, primary_key=True, autoincrement=True)
    receipt_id = Column(Integer, ForeignKey("receipts.receipt_id", ondelete="CASCADE"))

    raw_name = Column(Text, nullable=False)
    normalized_name = Column(String(255))
    category = Column(String(100))

    price = Column(Numeric(10,2))
    quantity = Column(Numeric(10, 2), default=1.0)

    estimated_expiration_date = Column(Date, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
