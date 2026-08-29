from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

from app import db


class User(db.Model):
    """
    Base identity/auth table shared by all three roles.
    role determines which profile table (retailers / drivers) this user links to.
    Admin users have no profile row — they're identified purely by role == 'admin'.
    """

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(16), nullable=False)  # 'admin' | 'retailer' | 'driver'
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    retailer_profile = db.relationship(
        "Retailer", backref="user", uselist=False, cascade="all, delete-orphan"
    )
    driver_profile = db.relationship(
        "Driver", backref="user", uselist=False, cascade="all, delete-orphan"
    )

    def set_password(self, raw_password):
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password):
        return check_password_hash(self.password_hash, raw_password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "is_active": self.is_active,
        }

    def __repr__(self):
        return f"<User {self.username} ({self.role})>"
