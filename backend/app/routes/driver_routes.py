from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity

from app import db
from app.auth.decorators import roles_required
from app.models.user import User
from app.models.trip import Trip
from app.models.driver_fare import DriverFare
from app.business_logic.trip_service import record_loading, start_transit, record_delivery, TripError
from app.business_logic.emergency_service import report_emergency, accept_backup, EmergencyError
from app.models.emergency_case import PROBLEM_TYPES, EmergencyCase
from app.models.backup_assignment import BackupAssignment
from app.business_logic.notification_service import list_for_user, mark_read, mark_all_read, NotificationError
from app.models.notification import Notification

driver_bp = Blueprint("driver", __name__)


def _current_driver():
    """Resolves the logged-in user's own driver profile. Never trust a driver_id from the request."""
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    return user.driver_profile if user else None


def _own_trip_or_none(driver, trip_id):
    """A driver can only ever act on a trip that is actually assigned to THEM."""
    return Trip.query.filter_by(id=trip_id, driver_id=driver.id).first()


@driver_bp.get("/profile")
@roles_required("driver")
def profile():
    driver = _current_driver()
    if not driver:
        return jsonify({"error": "Driver profile not found"}), 404
    return jsonify(driver.to_dict()), 200


@driver_bp.get("/dashboard")
@roles_required("driver")
def dashboard():
    driver = _current_driver()
    if not driver:
        return jsonify({"error": "Driver profile not found"}), 404

    # A driver can have more than one trip on the same day (e.g. they finish
    # trip 1, then get assigned trip 2, or take over an emergency trip as
    # backup). Prefer the most recent ACTIVE (not delivered/cancelled) trip
    # so a fresh emergency assignment always surfaces here instead of an
    # earlier completed trip.
    todays_trips = (
        Trip.query.filter_by(driver_id=driver.id, delivery_date=date.today())
        .order_by(Trip.id.desc())
        .all()
    )
    active_trip = next((t for t in todays_trips if t.status not in ("delivered", "cancelled")), None)
    todays_trip = active_trip or (todays_trips[0] if todays_trips else None)

    return jsonify(
        {
            "driver": driver.to_dict(),
            "todays_trip": todays_trip.to_dict() if todays_trip else None,
        }
    ), 200


@driver_bp.get("/trips/today")
@roles_required("driver")
def trips_today():
    driver = _current_driver()
    if not driver:
        return jsonify({"error": "Driver profile not found"}), 404

    trips = Trip.query.filter_by(driver_id=driver.id, delivery_date=date.today()).order_by(Trip.id.desc()).all()
    return jsonify([t.to_dict() for t in trips]), 200


@driver_bp.get("/trips")
@roles_required("driver")
def trip_history():
    driver = _current_driver()
    if not driver:
        return jsonify({"error": "Driver profile not found"}), 404

    trips = Trip.query.filter_by(driver_id=driver.id).order_by(Trip.id.desc()).limit(100).all()
    return jsonify([t.to_dict() for t in trips]), 200


@driver_bp.post("/trips/<int:trip_id>/load")
@roles_required("driver")
def load_trip(trip_id):
    driver = _current_driver()
    if not driver:
        return jsonify({"error": "Driver profile not found"}), 404

    trip = _own_trip_or_none(driver, trip_id)
    if not trip:
        return jsonify({"error": "Trip not found"}), 404

    data = request.get_json(silent=True) or {}
    try:
        record = record_loading(trip, data.get("loading_weight_kg"))
    except TripError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({"trip": trip.to_dict(), "weight_record": record.to_dict()}), 200


@driver_bp.post("/trips/<int:trip_id>/start")
@roles_required("driver")
def start_trip(trip_id):
    driver = _current_driver()
    if not driver:
        return jsonify({"error": "Driver profile not found"}), 404

    trip = _own_trip_or_none(driver, trip_id)
    if not trip:
        return jsonify({"error": "Trip not found"}), 404

    try:
        start_transit(trip)
    except TripError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(trip.to_dict()), 200


@driver_bp.post("/trips/<int:trip_id>/deliver")
@roles_required("driver")
def deliver_trip(trip_id):
    driver = _current_driver()
    if not driver:
        return jsonify({"error": "Driver profile not found"}), 404

    trip = _own_trip_or_none(driver, trip_id)
    if not trip:
        return jsonify({"error": "Trip not found"}), 404

    data = request.get_json(silent=True) or {}
    try:
        record, fare, high_loss_alert = record_delivery(trip, data.get("delivery_weight_kg"))
    except TripError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(
        {
            "trip": trip.to_dict(),
            "weight_record": record.to_dict(),
            "fare": fare.to_dict(),
            "high_loss_alert": high_loss_alert,
        }
    ), 200


@driver_bp.get("/fare")
@roles_required("driver")
def fare_history():
    """
    A driver can only ever see their OWN records — scoped server-side, never
    client-supplied. Weight-loss amount and driver fare are kept as two
    separate totals, matching the two separate per-trip records.
    """
    driver = _current_driver()
    if not driver:
        return jsonify({"error": "Driver profile not found"}), 404

    fares = DriverFare.query.filter_by(driver_id=driver.id).order_by(DriverFare.id.desc()).all()
    total_fare = sum(f.fare_amount for f in fares)
    total_weight_loss_amount = sum(f.weight_loss_amount for f in fares)
    this_month_fare = sum(
        f.fare_amount for f in fares if f.created_at and f.created_at.month == date.today().month
    )

    return jsonify(
        {
            "fares": [f.to_dict() for f in fares],
            "total_fare": round(total_fare, 2),
            "monthly_fare": round(this_month_fare, 2),
            "total_weight_loss_amount": round(total_weight_loss_amount, 2),
        }
    ), 200


@driver_bp.get("/performance")
@roles_required("driver")
def performance():
    driver = _current_driver()
    if not driver:
        return jsonify({"error": "Driver profile not found"}), 404

    trips = Trip.query.filter_by(driver_id=driver.id).all()
    completed = [t for t in trips if t.status == "delivered"]
    cancelled = [t for t in trips if t.status == "cancelled"]
    emergency = [t for t in trips if t.status == "emergency"]

    total_kg = sum(t.total_weight_kg or 0 for t in completed)
    losses = [t.weight_record.weight_loss_kg for t in completed if t.weight_record and t.weight_record.weight_loss_kg is not None]
    loss_percents = [
        t.weight_record.weight_loss_percent for t in completed if t.weight_record and t.weight_record.weight_loss_percent is not None
    ]
    total_earnings = sum(f.fare_amount for f in driver.fares) if driver.fares else 0
    total_weight_loss_amount = sum(f.weight_loss_amount for f in driver.fares) if driver.fares else 0

    return jsonify(
        {
            "total_trips": len(trips),
            "completed_trips": len(completed),
            "cancelled_trips": len(cancelled),
            "emergency_trips": len(emergency),
            "total_kg_transported": total_kg,
            "total_weight_loss_kg": round(sum(losses), 2) if losses else 0,
            "average_weight_loss_percent": round(sum(loss_percents) / len(loss_percents), 2) if loss_percents else 0,
            "total_earnings": round(total_earnings, 2),
            "total_weight_loss_amount": round(total_weight_loss_amount, 2),
        }
    ), 200


@driver_bp.post("/trips/<int:trip_id>/emergency")
@roles_required("driver")
def report_trip_emergency(trip_id):
    driver = _current_driver()
    if not driver:
        return jsonify({"error": "Driver profile not found"}), 404

    trip = _own_trip_or_none(driver, trip_id)
    if not trip:
        return jsonify({"error": "Trip not found"}), 404

    data = request.get_json(silent=True) or {}
    problem_type = data.get("problem_type")
    if problem_type not in PROBLEM_TYPES:
        return jsonify({"error": f"problem_type must be one of {PROBLEM_TYPES}"}), 400

    try:
        case = report_emergency(
            trip=trip,
            driver=driver,
            problem_type=problem_type,
            location=data.get("location"),
            notes=data.get("notes"),
        )
    except EmergencyError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(case.to_dict()), 201


@driver_bp.get("/emergencies")
@roles_required("driver")
def list_own_emergencies():
    """
    A driver's own emergencies: cases they personally reported, PLUS cases
    where they were assigned as the backup driver. Never another driver's
    case. This is what powers the "Emergency Assignment" card on the
    dashboard for a backup driver.
    """
    driver = _current_driver()
    if not driver:
        return jsonify({"error": "Driver profile not found"}), 404

    reported_ids = {c.id for c in EmergencyCase.query.filter_by(driver_id=driver.id).all()}
    backup_case_ids = {
        a.emergency_case_id
        for a in BackupAssignment.query.filter_by(backup_driver_id=driver.id).all()
    }
    all_ids = reported_ids | backup_case_ids
    if not all_ids:
        return jsonify([]), 200

    cases = (
        EmergencyCase.query.filter(EmergencyCase.id.in_(all_ids))
        .order_by(EmergencyCase.id.desc())
        .all()
    )
    result = []
    for c in cases:
        d = c.to_dict()
        d["role_in_case"] = "backup_driver" if c.id in backup_case_ids and c.driver_id != driver.id else "original_driver"
        result.append(d)
    return jsonify(result), 200


@driver_bp.post("/emergencies/<int:case_id>/accept")
@roles_required("driver")
def accept_emergency_trip(case_id):
    """Only the driver actually named as backup on this case may accept it."""
    driver = _current_driver()
    if not driver:
        return jsonify({"error": "Driver profile not found"}), 404

    case = EmergencyCase.query.get(case_id)
    if not case:
        return jsonify({"error": "Emergency case not found"}), 404

    try:
        accept_backup(case, driver)
    except EmergencyError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(case.to_dict()), 200


@driver_bp.get("/notifications")
@roles_required("driver")
def notifications():
    """Always scoped to the logged-in driver's own user id — never another driver's notifications."""
    user_id = int(get_jwt_identity())
    items, unread_count = list_for_user(user_id)
    return jsonify({"notifications": [n.to_dict() for n in items], "unread_count": unread_count}), 200


@driver_bp.patch("/notifications/<int:notification_id>/read")
@roles_required("driver")
def mark_notification_read(notification_id):
    user_id = int(get_jwt_identity())
    notification = Notification.query.get(notification_id)
    if not notification:
        return jsonify({"error": "Notification not found"}), 404

    try:
        mark_read(notification, user_id)
    except NotificationError as e:
        return jsonify({"error": str(e)}), 403

    return jsonify(notification.to_dict()), 200


@driver_bp.post("/notifications/read-all")
@roles_required("driver")
def mark_all_notifications_read():
    user_id = int(get_jwt_identity())
    count = mark_all_read(user_id)
    return jsonify({"marked_read": count}), 200
