from datetime import datetime
from app import db


class Driver(db.Model):
    __tablename__ = "drivers"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)

    driver_code = db.Column(db.String(32), unique=True, nullable=False)  # e.g. DRV-0001
    full_name = db.Column(db.String(128), nullable=False)
    mobile_number = db.Column(db.String(20), nullable=False)
    licence_number = db.Column(db.String(64), nullable=True)

    assigned_vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=True)

    # available | on_trip | offline | emergency
    status = db.Column(db.String(16), default="available", nullable=False)

    # rotation bookkeeping — used by Phase 3 round-robin assignment logic
    rotation_position = db.Column(db.Integer, default=0)
    last_trip_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "driver_code": self.driver_code,
            "full_name": self.full_name,
            "mobile_number": self.mobile_number,
            "licence_number": self.licence_number,
            "assigned_vehicle_id": self.assigned_vehicle_id,
            "status": self.status,
        }
