from datetime import datetime
from app import db

PROBLEM_TYPES = ["breakdown", "accident", "engine_problem", "tyre_problem", "other"]

# Simplified from the full REPORTED -> BACKUP_SEARCHING -> BACKUP_ASSIGNED ->
# BACKUP_ACCEPTED -> IN_PROGRESS -> RESOLVED lifecycle: BACKUP_SEARCHING and
# IN_PROGRESS aren't separately persisted states here (searching happens
# synchronously inside assign_backup, and "in progress" is already tracked
# by Trip.status once a backup takes over) — accepted_at below captures the
# meaningful "driver accepted" moment without a redundant status hop.
EMERGENCY_STATUSES = ["reported", "backup_assigned", "resolved", "no_backup_available"]


class EmergencyCase(db.Model):
    __tablename__ = "emergency_cases"

    id = db.Column(db.Integer, primary_key=True)

    trip_id = db.Column(db.Integer, db.ForeignKey("trips.id"), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey("drivers.id"), nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=False)

    problem_type = db.Column(db.String(24), nullable=False)
    location = db.Column(db.String(256), nullable=True)
    notes = db.Column(db.String(500), nullable=True)

    # MVP simplification: the whole trip load is treated as "remaining" since
    # per-stop delivery isn't tracked yet within a trip. Section 26 (GPS/live
    # location) will let this be computed precisely from actual progress.
    load_remaining_kg = db.Column(db.Float, nullable=False)

    status = db.Column(db.String(24), default="reported", nullable=False)

    reported_at = db.Column(db.DateTime, default=datetime.utcnow)
    accepted_at = db.Column(db.DateTime, nullable=True)  # backup driver confirmed they're taking over
    resolved_at = db.Column(db.DateTime, nullable=True)

    trip = db.relationship("Trip", backref="emergency_cases")
    driver = db.relationship("Driver")  # the ORIGINAL reporting driver — preserved for audit even after backup takes over
    vehicle = db.relationship("Vehicle")  # the ORIGINAL vehicle

    def to_dict(self):
        trip = self.trip
        return {
            "id": self.id,
            "trip_id": self.trip_id,
            "trip_code": trip.trip_code if trip else None,
            "route_name": trip.route.name if trip and trip.route else None,
            "order_count": len(trip.trip_orders) if trip else 0,
            "total_weight_kg": trip.total_weight_kg if trip else None,
            "driver_id": self.driver_id,
            "driver_name": self.driver.full_name if self.driver else None,
            "vehicle_id": self.vehicle_id,
            "vehicle_number": self.vehicle.vehicle_number if self.vehicle else None,
            "problem_type": self.problem_type,
            "location": self.location,
            "notes": self.notes,
            "load_remaining_kg": self.load_remaining_kg,
            "status": self.status,
            "reported_at": self.reported_at.isoformat() if self.reported_at else None,
            "accepted_at": self.accepted_at.isoformat() if self.accepted_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "backup_assignment": self.backup_assignment.to_dict() if self.backup_assignment else None,
        }
