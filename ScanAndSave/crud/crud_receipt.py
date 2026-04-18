from sqlalchemy.orm import Session, selectinload
from ScanAndSave.models.receipt import Receipt
from ScanAndSave.schemas.receipt import ReceiptCreate

def create_receipt(db: Session, receipt: ReceiptCreate, user_id: int):
    # Create the model instance
    db_receipt = Receipt(
        user_id=user_id,
        store=receipt.store,
        purchase_date=receipt.purchase_date,
        total_amount=receipt.total_amount
    )
    
    # Save to MySQL
    db.add(db_receipt)
    db.commit()
    db.refresh(db_receipt)
    return db_receipt

# Get a receipt by receipt ID
def get_receipt(db: Session, receipt_id: int):
    return (
        db.query(Receipt)
        .options(selectinload(Receipt.items))
        .filter(Receipt.receipt_id == receipt_id)
        .first()
    )

# Get all receipts by user ID
def get_user_receipts(db: Session, user_id: int):
    return db.query(Receipt).filter(
        Receipt.user_id == user_id
    ).all()

def delete_receipt(db: Session, receipt_id: int, user_id: int):
    receipt = db.query(Receipt).filter(
        Receipt.receipt_id == receipt_id,
        Receipt.user_id == user_id
    ).first()

    if receipt:
        db.delete(receipt)
        db.commit()

    return receipt

def update_receipt(db: Session, receipt_id: int, user_id: int, new_data: dict):
    receipt = db.query(Receipt).filter(
        Receipt.receipt_id == receipt_id,
        Receipt.user_id == user_id
    ).first()

    if not receipt:
        return None

    for key, value in new_data.items():
        setattr(receipt, key, value)

    db.commit()
    db.refresh(receipt)
    return receipt