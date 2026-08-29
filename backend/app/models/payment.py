from datetime import datetime
from app import db

PAYMENT_METHODS = ["cash", "upi", "bank_transfer", "cheque", "other"]


class Payment(db.Model):
    """
    A single payment recorded against an order. An order's paid/pending
    amounts and status are always DERIVED by summing these rows (see
    order_service.get_payment_summary) rather than stored as columns on
    Order, so there's never a chance of the two going out of sync.
    """

    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    retailer_id = db.Column(db.Integer, db.ForeignKey("retailers.id"), nullable=False)

    amount = db.Column(db.Float, nullable=False)
    method = db.Column(db.String(20), default="cash", nullable=False)
    notes = db.Column(db.String(300), nullable=True)
    recorded_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    order = db.relationship("Order", backref="payments")
    retailer = db.relationship("Retailer")

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "order_code": self.order.order_code if self.order else None,
            "retailer_id": self.retailer_id,
            "retailer_shop_name": self.retailer.shop_name if self.retailer else None,
            "amount": self.amount,
            "method": self.method,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
