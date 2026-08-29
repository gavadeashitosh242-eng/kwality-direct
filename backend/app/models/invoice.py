from datetime import datetime
from app import db


class Invoice(db.Model):
    """
    One invoice per (delivered) order. Deliberately stores almost nothing
    beyond the invoice number and timestamp — company, retailer, quantity,
    rate, total, and date are all read live from the linked Order (which
    already snapshots its own rate/total permanently), so there's a single
    source of truth and no risk of the invoice drifting from the order.
    """

    __tablename__ = "invoices"

    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(32), unique=True, nullable=False)  # e.g. INV-00001
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), unique=True, nullable=False)

    generated_at = db.Column(db.DateTime, default=datetime.utcnow)

    order = db.relationship("Order", backref=db.backref("invoice", uselist=False))

    def to_dict(self, payment_summary=None):
        order = self.order
        return {
            "id": self.id,
            "invoice_number": self.invoice_number,
            "generated_at": self.generated_at.isoformat() if self.generated_at else None,
            "company_name": "Kwality Direct",
            "order_id": order.id,
            "order_code": order.order_code,
            "retailer_shop_name": order.retailer.shop_name if order.retailer else None,
            "retailer_owner_name": order.retailer.owner_name if order.retailer else None,
            "area_name": order.area.name if order.area else order.delivery_area_snapshot,
            "product": order.product,
            "quantity_kg": order.quantity_kg,
            "rate_per_kg": order.rate_per_kg,
            "total_amount": order.total_amount,
            "delivery_date": order.delivery_date.isoformat(),
            "payment_status": payment_summary["status"] if payment_summary else None,
            "paid_amount": payment_summary["paid_amount"] if payment_summary else None,
            "pending_amount": payment_summary["pending_amount"] if payment_summary else None,
        }
