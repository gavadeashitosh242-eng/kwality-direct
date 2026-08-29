from datetime import datetime
from app import db


class WeightRecord(db.Model):
    __tablename__ = "weight_records"

    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey("trips.id"), unique=True, nullable=False)

    loading_weight_kg = db.Column(db.Float, nullable=True)
    delivery_weight_kg = db.Column(db.Float, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    trip = db.relationship("Trip", backref=db.backref("weight_record", uselist=False))

    @property
    def weight_loss_kg(self):
        if self.loading_weight_kg is None or self.delivery_weight_kg is None:
            return None
        return round(self.loading_weight_kg - self.delivery_weight_kg, 2)

    @property
    def weight_loss_percent(self):
        loss = self.weight_loss_kg
        if loss is None or not self.loading_weight_kg:
            return None
        return round((loss / self.loading_weight_kg) * 100, 2)

    def to_dict(self):
        return {
            "id": self.id,
            "trip_id": self.trip_id,
            "loading_weight_kg": self.loading_weight_kg,
            "delivery_weight_kg": self.delivery_weight_kg,
            "weight_loss_kg": self.weight_loss_kg,
            "weight_loss_percent": self.weight_loss_percent,
        }
