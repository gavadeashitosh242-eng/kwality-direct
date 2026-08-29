from datetime import datetime
from app import db


class Route(db.Model):
    """
    A practical grouping of nearby delivery areas (e.g. "Chandgad -> Panaji ->
    Old Goa -> Mapusa"). Areas are assigned to a route via Area.route_id.
    Phase 3 uses this for rule-based grouping; GPS-based optimization is a
    later phase.
    """

    __tablename__ = "routes"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), unique=True, nullable=False)
    source = db.Column(db.String(64), nullable=True)  # e.g. "Chandgad"
    region = db.Column(db.String(64), nullable=True)  # e.g. "Goa"

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    areas = db.relationship("Area", backref="route", order_by="Area.route_sequence")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "source": self.source,
            "region": self.region,
            "areas": [
                {"id": a.id, "name": a.name, "route_sequence": a.route_sequence}
                for a in sorted(self.areas, key=lambda a: a.route_sequence or 0)
            ],
        }
