from sqlalchemy import Column, DateTime, Integer, String, ForeignKey, Date, Numeric # Whatever imports are needed
from ScanAndSave.database.session import Base
from sqlalchemy.orm import relationship

class Receipt(Base):
    __tablename__ = "receipts"

    receipt_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    store = Column(String(100), nullable=False)
    purchase_date = Column(Date, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    user = relationship("User", back_populates="receipts")
    items = relationship("Item", back_populates="receipt", cascade="all, delete-orphan")