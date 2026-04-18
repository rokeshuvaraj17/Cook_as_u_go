from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ScanAndSave.api.endpoints.deps import get_database, get_current_user
from ScanAndSave.schemas.inventory import InventoryResponse, InventoryDecrementRequest
from ScanAndSave.models.user import User
from ScanAndSave.crud import crud_inventory

router = APIRouter()


@router.get("/", response_model=list[InventoryResponse])
def read_inventory(
    db: Session = Depends(get_database),
    current_user: User = Depends(get_current_user),
):
    return crud_inventory.get_user_inventory(db=db, user_id=current_user.id)


@router.patch("/{inventory_id}/decrement", response_model=InventoryResponse)
def decrement_inventory(
    inventory_id: int,
    payload: InventoryDecrementRequest,
    db: Session = Depends(get_database),
    current_user: User = Depends(get_current_user),
):
    inventory = crud_inventory.decrement_inventory_quantity(
        db=db,
        inventory_id=inventory_id,
        user_id=current_user.id,
        amount=payload.amount,
    )
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return inventory


@router.delete("/{inventory_id}", response_model=InventoryResponse)
def delete_inventory(
    inventory_id: int,
    db: Session = Depends(get_database),
    current_user: User = Depends(get_current_user),
):
    inventory = crud_inventory.delete_inventory(
        db=db, inventory_id=inventory_id, user_id=current_user.id
    )
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return inventory