from datetime import datetime
from app import db


class DriverFare(db.Model):
    """
    Two SEPARATE financial records per delivered trip, both snapshotted at
    delivery time so a later rate change never rewrites history:

      - weight_loss_amount = weight_loss_kg × weight_loss_rate_per_kg
        (a penalty/recovery record against the driver, NOT their pay)
      - fare_amount = delivered_weight_kg × driver_fare_rate_per_kg
        (the driver's actual earning — based on delivered weight ONLY,
        never on loaded weight and never on the weight-loss amount)

    Despite the table name (kept for backward compatibility with existing
    Phase 1-4 code/queries), this row stores both records together since
    they're always computed and displayed together per trip.
    """

    __tablename__ = "driver_fares"

    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey("trips.id"), unique=True, nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey("drivers.id"), nullable=False)

    # Weight loss amount (penalty/recovery record) — separate from fare
    weight_loss_kg = db.Column(db.Float, nullable=False)
    weight_loss_rate_per_kg = db.Column(db.Float, nullable=False)  # snapshot of FareRate.rate_per_kg_loss
    weight_loss_amount = db.Column(db.Float, nullable=False, default=0)

    # Driver fare — based on DELIVERED weight only, never loaded weight or loss
    delivered_weight_kg = db.Column(db.Float, nullable=False, default=0)
    driver_fare_rate_per_kg = db.Column(db.Float, nullable=False, default=0)  # snapshot of FareRate.driver_fare_rate_per_kg
    fare_amount = db.Column(db.Float, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    trip = db.relationship("Trip", backref=db.backref("driver_fare", uselist=False))
    driver = db.relationship("Driver", backref="fares")

    def to_dict(self):
        return {
            "id": self.id,
            "trip_id": self.trip_id,
            "trip_code": self.trip.trip_code if self.trip else None,
            "driver_id": self.driver_id,
            "loaded_weight_kg": self.trip.weight_record.loading_weight_kg if self.trip and self.trip.weight_record else None,
            "delivered_weight_kg": self.delivered_weight_kg,
            "weight_loss_kg": self.weight_loss_kg,
            "weight_loss_rate_per_kg": self.weight_loss_rate_per_kg,
            "weight_loss_amount": self.weight_loss_amount,
            "driver_fare_rate_per_kg": self.driver_fare_rate_per_kg,
            "fare_amount": self.fare_amount,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
