from datetime import datetime

from app import db
from app.models.notification import Notification
from app.models.user import User


class NotificationError(Exception):
    """Raised for notification access-control violations. Route layer converts to 4xx."""


def notify_user(user_id, notification_type, title, message, related_emergency_id=None, related_trip_id=None):
    """Creates a single notification for one recipient. Never notifies anyone else."""
    notification = Notification(
        recipient_user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        related_emergency_id=related_emergency_id,
        related_trip_id=related_trip_id,
    )
    db.session.add(notification)
    return notification


def notify_admins(notification_type, title, message, related_emergency_id=None, related_trip_id=None):
    """
    Creates one notification row per admin user, so every admin sees it and
    each admin's read state is independent. Does not commit — the caller
    (inside a business-logic transaction) commits once at the end.
    """
    admin_ids = [u.id for u in User.query.filter_by(role="admin").all()]
    created = []
    for admin_id in admin_ids:
        created.append(
            notify_user(admin_id, notification_type, title, message, related_emergency_id, related_trip_id)
        )
    return created


def notify_driver(driver, notification_type, title, message, related_emergency_id=None, related_trip_id=None):
    """Notifies exactly the given driver's own user account — never another driver."""
    return notify_user(
        driver.user_id, notification_type, title, message, related_emergency_id, related_trip_id
    )


def mark_read(notification, requesting_user_id):
    """A user can only ever mark THEIR OWN notification as read."""
    if notification.recipient_user_id != requesting_user_id:
        raise NotificationError("This notification does not belong to you")
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.session.commit()
    return notification


def mark_all_read(user_id):
    unread = Notification.query.filter_by(recipient_user_id=user_id, is_read=False).all()
    now = datetime.utcnow()
    for n in unread:
        n.is_read = True
        n.read_at = now
    db.session.commit()
    return len(unread)


def list_for_user(user_id, limit=50):
    """Always scoped to the requesting user's own id — callers must pass the ID from the JWT, never from a request param."""
    notifications = (
        Notification.query.filter_by(recipient_user_id=user_id)
        .order_by(Notification.id.desc())
        .limit(limit)
        .all()
    )
    unread_count = Notification.query.filter_by(recipient_user_id=user_id, is_read=False).count()
    return notifications, unread_count
