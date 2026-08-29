from datetime import datetime, date
from app import db


class ChickenRate(db.Model):
    __tablename__ = "chicken_rates"

    id = db.Column(db.Integer, primary_key=True)
    rate_date = db.Column(db.Date, default=date.today, nullable=False, unique=True)
    rate_per_kg = db.Column(db.Float, nullable=False)
    set_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "rate_date": self.rate_date.isoformat(),
            "rate_per_kg": self.rate_per_kg,
        }
