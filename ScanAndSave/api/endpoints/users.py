from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ScanAndSave.api.endpoints.deps import get_database
from ScanAndSave.schemas.user import UserCreate, UserResponse
from ScanAndSave.crud import crud_user
from ScanAndSave.models.user import User
from ScanAndSave.api.endpoints.deps import get_current_user
router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register_new_user(user_in: UserCreate, db: Session = Depends(get_database)):
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_in.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
        
    return crud_user.create_user(db, user_in)

@router.get("/", response_model=list[UserResponse])
def read_users(
    db: Session = Depends(get_database),
    current_user: User = Depends(get_current_user)
):
    return db.query(User).all()
