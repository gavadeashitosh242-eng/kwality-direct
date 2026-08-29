from datetime import datetime
from app import db

NOTIFICATION_TYPES = [
    "EMERGENCY_REPORTED",
    "EMERGENCY_BACKUP_ASSIGNED",
    "EMERGENCY_NO_BACKUP_AVAILABLE",
    "EMERGENCY_RESOLVED",
]


class Notification(db.Model):
    """
    In-app notification, addressed to a single user (recipient_user_id) so
    access is naturally scoped server-side — a driver can only ever query
    their own rows, an admin only theirs. Stored in the DB (not just pushed
    over a socket) so refreshing the page never loses it.

    `channel` is included so this table is ready for future SMS/WhatsApp/
    phone-call delivery without a schema change — for now every row is
    'in_app' and that's the only channel actually delivered.
    """

    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    recipient_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    notification_type = db.Column(db.String(40), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.String(1000), nullable=False)

    related_emergency_id = db.Column(db.Integer, db.ForeignKey("emergency_cases.id"), nullable=True)
    related_trip_id = db.Column(db.Integer, db.ForeignKey("trips.id"), nullable=True)

    channel = db.Column(db.String(20), default="in_app", nullable=False)

    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    read_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "notification_type": self.notification_type,
            "title": self.title,
            "message": self.message,
            "related_emergency_id": self.related_emergency_id,
            "related_trip_id": self.related_trip_id,
            "channel": self.channel,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "read_at": self.read_at.isoformat() if self.read_at else None,
        }
