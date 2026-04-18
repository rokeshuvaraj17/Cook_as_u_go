from sqlalchemy.orm import Session
from ScanAndSave.models.user import User
from ScanAndSave.schemas.user import UserCreate
from ScanAndSave.security import hash_password

def create_user(db: Session, user_in: UserCreate):
    # 1. Hash the password before saving
    hashed_pw = hash_password(user_in.password)

    # 2. Create the model instance
    db_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_pw # Store the hash
    )
    
    # 3. Save to MySQL
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user