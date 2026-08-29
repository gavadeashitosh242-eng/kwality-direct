from datetime import datetime
from app import db


class Area(db.Model):
    __tablename__ = "areas"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)  # e.g. Panaji, Mapusa
    region = db.Column(db.String(64), nullable=True)  # e.g. Goa

    # Phase 3: which practical route this area belongs to, and its stop
    # order within that route (used to sequence deliveries and to sort
    # orders before bin-packing them into vehicles).
    route_id = db.Column(db.Integer, db.ForeignKey("routes.id"), nullable=True)
    route_sequence = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "region": self.region,
            "route_id": self.route_id,
            "route_sequence": self.route_sequence,
        }
