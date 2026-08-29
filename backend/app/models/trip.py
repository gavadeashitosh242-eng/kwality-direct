from datetime import datetime, date
from app import db

TRIP_STATUSES = [
    "vehicle_assigned",
    "driver_assigned",
    "loaded",
    "in_transit",
    "delivered",
    "emergency",
    "cancelled",
]


class Trip(db.Model):
    __tablename__ = "trips"

    id = db.Column(db.Integer, primary_key=True)
    trip_code = db.Column(db.String(32), unique=True, nullable=False)  # e.g. TRIP-00001

    route_id = db.Column(db.Integer, db.ForeignKey("routes.id"), nullable=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey("drivers.id"), nullable=True)

    delivery_date = db.Column(db.Date, default=date.today, nullable=False)
    total_weight_kg = db.Column(db.Float, default=0)

    status = db.Column(db.String(24), default="vehicle_assigned", nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    route = db.relationship("Route")
    vehicle = db.relationship("Vehicle")
    driver = db.relationship("Driver")
    trip_orders = db.relationship("TripOrder", backref="trip", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "trip_code": self.trip_code,
            "route_id": self.route_id,
            "route_name": self.route.name if self.route else None,
            "vehicle_id": self.vehicle_id,
            "vehicle_number": self.vehicle.vehicle_number if self.vehicle else None,
            "vehicle_capacity_kg": self.vehicle.capacity_kg if self.vehicle else None,
            "driver_id": self.driver_id,
            "driver_name": self.driver.full_name if self.driver else None,
            "delivery_date": self.delivery_date.isoformat(),
            "total_weight_kg": self.total_weight_kg,
            "status": self.status,
            "order_count": len(self.trip_orders),
            "orders": [to.order.to_dict() for to in self.trip_orders],
        }


class TripOrder(db.Model):
    """Join table: which retailer orders are loaded onto this trip, in what delivery sequence."""

    __tablename__ = "trip_orders"

    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey("trips.id"), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), unique=True, nullable=False)
    delivery_sequence = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    order = db.relationship("Order")
