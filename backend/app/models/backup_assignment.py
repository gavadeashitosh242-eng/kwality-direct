from datetime import datetime
from app import db


class BackupAssignment(db.Model):
    __tablename__ = "backup_assignments"

    id = db.Column(db.Integer, primary_key=True)
    emergency_case_id = db.Column(db.Integer, db.ForeignKey("emergency_cases.id"), unique=True, nullable=False)

    backup_vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=False)
    backup_driver_id = db.Column(db.Integer, db.ForeignKey("drivers.id"), nullable=False)
    load_transferred_kg = db.Column(db.Float, nullable=False)

    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)

    emergency_case = db.relationship("EmergencyCase", backref=db.backref("backup_assignment", uselist=False))
    backup_vehicle = db.relationship("Vehicle")
    backup_driver = db.relationship("Driver")

    def to_dict(self):
        return {
            "id": self.id,
            "backup_vehicle_id": self.backup_vehicle_id,
            "backup_vehicle_number": self.backup_vehicle.vehicle_number if self.backup_vehicle else None,
            "backup_driver_id": self.backup_driver_id,
            "backup_driver_name": self.backup_driver.full_name if self.backup_driver else None,
            "load_transferred_kg": self.load_transferred_kg,
            "assigned_at": self.assigned_at.isoformat() if self.assigned_at else None,
        }
