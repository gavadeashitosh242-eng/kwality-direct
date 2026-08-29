from datetime import datetime, date
from app import db


class FareRate(db.Model):
    """
    Admin-configured rates for the two SEPARATE driver financial records:
      - rate_per_kg_loss: ₹ per KG of weight LOSS (loaded - delivered) —
        recorded as a separate weight-loss amount against the driver.
      - driver_fare_rate_per_kg: ₹ per KG DELIVERED — the driver's actual
        fare/earning. Deliberately NOT based on loaded weight or loss.
    Mirrors ChickenRate — today's rates are used, but each DriverFare record
    snapshots both rates at delivery time, so changing them later never
    rewrites past records.
    """

    __tablename__ = "fare_rates"

    id = db.Column(db.Integer, primary_key=True)
    rate_date = db.Column(db.Date, default=date.today, nullable=False, unique=True)
    rate_per_kg_loss = db.Column(db.Float, nullable=False)
    driver_fare_rate_per_kg = db.Column(db.Float, nullable=False, default=0)
    set_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "rate_date": self.rate_date.isoformat(),
            "rate_per_kg_loss": self.rate_per_kg_loss,
            "driver_fare_rate_per_kg": self.driver_fare_rate_per_kg,
        }
