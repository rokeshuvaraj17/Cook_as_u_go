from pathlib import Path
from fastapi import FastAPI, UploadFile, File
from ScanAndSave.database.session import engine, Base
from ScanAndSave.models import user # Import all models to register them

app = FastAPI()

from ScanAndSave.api.endpoints import users, auth, receipts, items, inventory

app.include_router(
    users.router,
    prefix="/users",
    tags=["users"]
)

app.include_router(
    auth.router,
    prefix="/auth",
    tags=["auth"]
)

app.include_router(
    receipts.router,
    prefix="/receipts",
    tags=["receipts"]
)

app.include_router(
    items.router,
    prefix="/items",
    tags=["items"]
)

app.include_router(
    inventory.router,
    prefix="/inventory",
    tags=["inventory"]
)

Base.metadata.create_all(bind=engine)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)