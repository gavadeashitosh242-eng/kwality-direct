from datetime import datetime
from app import db


class Retailer(db.Model):
    __tablename__ = "retailers"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)

    retailer_code = db.Column(db.String(32), unique=True, nullable=False)  # e.g. RET-0001
    shop_name = db.Column(db.String(128), nullable=False)
    owner_name = db.Column(db.String(128), nullable=False)
    mobile_number = db.Column(db.String(20), nullable=False)
    area_id = db.Column(db.Integer, db.ForeignKey("areas.id"), nullable=True)

    status = db.Column(db.String(16), default="active", nullable=False)  # active/inactive/blocked

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "retailer_code": self.retailer_code,
            "shop_name": self.shop_name,
            "owner_name": self.owner_name,
            "mobile_number": self.mobile_number,
            "area_id": self.area_id,
            "status": self.status,
        }
