from datetime import datetime
from app import db


class Vehicle(db.Model):
    __tablename__ = "vehicles"

    id = db.Column(db.Integer, primary_key=True)
    vehicle_number = db.Column(db.String(32), unique=True, nullable=False)
    capacity_kg = db.Column(db.Float, nullable=False)

    # available | loading | on_trip | maintenance | emergency | offline
    status = db.Column(db.String(16), default="available", nullable=False)
    is_backup = db.Column(db.Boolean, default=False, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "vehicle_number": self.vehicle_number,
            "capacity_kg": self.capacity_kg,
            "status": self.status,
            "is_backup": self.is_backup,
        }
