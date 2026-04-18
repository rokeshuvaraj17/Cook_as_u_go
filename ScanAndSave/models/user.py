from sqlalchemy import Column, DateTime, Integer, String # Whatever imports are needed
from ScanAndSave.database.session import Base
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True)
    email = Column(String(100), unique=True)
    hashed_password = Column(String(70), nullable=False)
    receipts = relationship("Receipt", back_populates="user", cascade="all, delete")