from sqlalchemy.orm import Session
from ScanAndSave.models.item import Item
from ScanAndSave.models.receipt import Receipt
from ScanAndSave.schemas.item import ItemCreate

def create_item(db: Session, item: ItemCreate):

    db_item = Item(
        receipt_id=item.receipt_id,
        raw_name=item.raw_name,
        normalized_name=item.normalized_name,
        category=item.category,
        price=item.price,
        quantity=item.quantity,
        estimated_expiration_date=item.estimated_expiration_date
    )

    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

# get item by item id
def get_item(db: Session, item_id: int, user_id: int):
    return db.query(Item).join(Receipt).filter(
        Item.id == item_id,
        Receipt.user_id == user_id
    ).first()

# Get all items by user id
def get_user_items(db: Session, user_id: int):
    return db.query(Item).join(Receipt).filter(
        Receipt.user_id == user_id
    ).all()

# delete item 
def delete_item(db: Session, item_id: int, user_id: int):
    item = db.query(Item).join(Receipt).filter(
        Item.id == item_id,
        Receipt.user_id == user_id
    ).first()

    if item:
        db.delete(item)
        db.commit()

    return item

# update item
def update_item(db: Session, item_id: int, user_id: int, new_data: dict):
    
    item = db.query(Item).join(Receipt).filter(
        Item.id == item_id,
        Receipt.user_id == user_id
    ).first()

    if not item:
        return None
    
    for key, value in new_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item