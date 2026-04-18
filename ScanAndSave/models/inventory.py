from ScanAndSave.database.session import Base
from sqlalchemy import Column, Integer, ForeignKey, Text, String, Numeric, Date

class Inventory(Base):
    __tablename__ = 'inventory'

    id = Column(Integer, primary_key=True, autoincrement=True)

    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    name = Column(Text, nullable=False)
    category = Column(String(100))
    quantity = Column(Numeric(10, 2), default=1.0)
    estimated_expiration_date = Column(Date, nullable=True)

