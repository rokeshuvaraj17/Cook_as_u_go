from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from ScanAndSave.database.session import SessionLocal
from ScanAndSave.models.user import User  
from ScanAndSave.security import SECRET_KEY, ALGORITHM 


def get_database():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# 1. Define the OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# 2. Define a reusable Exception
credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)

async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_database)
):
    try:
        # Decode the JWT
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        
        if username is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    # Fetch user from MySQL
    user = db.query(User).filter(User.username == username).first()
    
    if user is None:
        raise credentials_exception
        
    return user

