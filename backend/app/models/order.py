from datetime import datetime, date
from app import db

# Business flow (Phase 2 implements PLACED <-> CONFIRMED/CANCELLED;
# AREA_GROUPED..DELIVERED are driven by Phase 3-4 dispatch/trip logic).
ORDER_STATUSES = [
    "placed",
    "confirmed",
    "area_grouped",
    "vehicle_assigned",
    "driver_assigned",
    "loaded",
    "in_transit",
    "delivered",
    "cancelled",
    "emergency",
    "backup_assigned",
]


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    order_code = db.Column(db.String(32), unique=True, nullable=False)  # e.g. ORD-0001

    retailer_id = db.Column(db.Integer, db.ForeignKey("retailers.id"), nullable=False)
    area_id = db.Column(db.Integer, db.ForeignKey("areas.id"), nullable=False)

    product = db.Column(db.String(64), default="Broiler Chicken", nullable=False)
    quantity_kg = db.Column(db.Float, nullable=False)

    # Rate snapshot — captured from ChickenRate at the moment the order is
    # placed. This value NEVER changes even if the daily rate changes later.
    rate_per_kg = db.Column(db.Float, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)

    delivery_area_snapshot = db.Column(db.String(64), nullable=True)  # denormalized for history/audit
    delivery_date = db.Column(db.Date, default=date.today, nullable=False)

    status = db.Column(db.String(24), default="placed", nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    retailer = db.relationship("Retailer", backref="orders")
    area = db.relationship("Area", backref="orders")

    def to_dict(self):
        return {
            "id": self.id,
            "order_code": self.order_code,
            "retailer_id": self.retailer_id,
            "retailer_shop_name": self.retailer.shop_name if self.retailer else None,
            "area_id": self.area_id,
            "area_name": self.area.name if self.area else self.delivery_area_snapshot,
            "product": self.product,
            "quantity_kg": self.quantity_kg,
            "rate_per_kg": self.rate_per_kg,
            "total_amount": self.total_amount,
            "delivery_date": self.delivery_date.isoformat(),
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
