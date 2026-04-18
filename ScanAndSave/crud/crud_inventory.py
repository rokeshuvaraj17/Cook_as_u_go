from decimal import Decimal
from sqlalchemy.orm import Session
from ScanAndSave.models.inventory import Inventory
from ScanAndSave.schemas.item import ItemCreate


# Call this from receipt scanner
def create_inventory_item(db: Session, item_id: int, user_id: int, item: ItemCreate):
    db_inventory = Inventory(
        item_id=item_id,
        user_id=user_id,
        name=item.normalized_name or item.raw_name,
        category=item.category,
        quantity=item.quantity,
        estimated_expiration_date=item.estimated_expiration_date,
    )

    db.add(db_inventory)
    db.commit()
    db.refresh(db_inventory)
    return db_inventory


def get_user_inventory(db: Session, user_id: int):
    # most recent expiration date -> least recent; null dates at end
    return (
        db.query(Inventory)
        .filter(Inventory.user_id == user_id)
        .order_by(
            Inventory.estimated_expiration_date.is_(None),
            Inventory.estimated_expiration_date.desc(),
            Inventory.id.desc(),
        )
        .all()
    )


def decrement_inventory_quantity(
    db: Session, inventory_id: int, user_id: int, amount: float = 1.0
):
    inventory = (
        db.query(Inventory)
        .filter(Inventory.id == inventory_id, Inventory.user_id == user_id)
        .first()
    )

    if not inventory:
        return None

    current_qty = Decimal(str(inventory.quantity or 0))
    decrement_by = Decimal(str(amount))
    next_qty = current_qty - decrement_by
    inventory.quantity = next_qty if next_qty > 0 else Decimal("0")

    db.commit()
    db.refresh(inventory)
    return inventory


def delete_inventory(db: Session, inventory_id: int, user_id: int):
    inventory = (
        db.query(Inventory)
        .filter(Inventory.id == inventory_id, Inventory.user_id == user_id)
        .first()
    )

    if inventory:
        db.delete(inventory)
        db.commit()

    return inventory

def get_inventory_by_item(db: Session, item_id: int, user_id: int):
    return (
        db.query(Inventory)
        .filter(Inventory.item_id == item_id, Inventory.user_id == user_id)
        .first()
    )