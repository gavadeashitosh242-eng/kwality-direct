from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity

from app import db
from app.auth.decorators import roles_required
from app.models.retailer import Retailer
from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.models.area import Area
from app.models.chicken_rate import ChickenRate
from app.models.order import Order
from app.models.route import Route
from app.models.trip import Trip
from app.models.fare_rate import FareRate
from app.models.weight_record import WeightRecord
from app.models.driver_fare import DriverFare
from app.models.emergency_case import EmergencyCase
from app.business_logic.onboarding_service import create_retailer, create_driver, OnboardingError
from app.business_logic.dispatch_service import run_dispatch, area_wise_demand, DispatchError
from app.business_logic.emergency_service import assign_backup, resolve_emergency, EmergencyError
from app.business_logic.notification_service import list_for_user, mark_read, mark_all_read, NotificationError
from app.models.notification import Notification
from app.models.payment import Payment
from app.models.invoice import Invoice
from app.business_logic.payment_service import record_payment, get_payment_summary, PaymentError
from app.business_logic.invoice_service import generate_invoice, InvoiceError
from app.business_logic import analytics_service

admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/dashboard")
@roles_required("admin")
def dashboard():
    latest_rate = ChickenRate.query.order_by(ChickenRate.rate_date.desc()).first()
    today_orders = Order.query.filter_by(delivery_date=date.today()).count()
    total_kg_ordered = db.session.query(db.func.coalesce(db.func.sum(Order.quantity_kg), 0)).scalar()
    open_emergencies = EmergencyCase.query.filter(EmergencyCase.status != "resolved").count()

    return jsonify(
        {
            "active_retailers": Retailer.query.filter_by(status="active").count(),
            "total_drivers": Driver.query.count(),
            "available_vehicles": Vehicle.query.filter_by(status="available").count(),
            "current_chicken_rate": latest_rate.to_dict() if latest_rate else None,
            "todays_orders": today_orders,
            "total_orders": Order.query.count(),
            "total_kg_ordered": total_kg_ordered,
            "open_emergencies": open_emergencies,
        }
    ), 200


# ---------------------------------------------------------------- Retailers

@admin_bp.get("/retailers")
@roles_required("admin")
def list_retailers():
    return jsonify([r.to_dict() for r in Retailer.query.order_by(Retailer.id.desc()).all()]), 200


@admin_bp.post("/retailers")
@roles_required("admin")
def add_retailer():
    data = request.get_json(silent=True) or {}
    required = ["username", "password", "shop_name", "owner_name", "mobile_number"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        retailer = create_retailer(
            username=data["username"],
            password=data["password"],
            shop_name=data["shop_name"],
            owner_name=data["owner_name"],
            mobile_number=data["mobile_number"],
            area_id=data.get("area_id"),
        )
    except OnboardingError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(retailer.to_dict()), 201


@admin_bp.patch("/retailers/<int:retailer_id>")
@roles_required("admin")
def update_retailer(retailer_id):
    retailer = Retailer.query.get(retailer_id)
    if not retailer:
        return jsonify({"error": "Retailer not found"}), 404

    data = request.get_json(silent=True) or {}
    if "status" in data:
        if data["status"] not in ("active", "inactive", "blocked"):
            return jsonify({"error": "Invalid status"}), 400
        retailer.status = data["status"]
    for field in ("shop_name", "owner_name", "mobile_number", "area_id"):
        if field in data:
            setattr(retailer, field, data[field])

    db.session.commit()
    return jsonify(retailer.to_dict()), 200


# ------------------------------------------------------------------ Drivers

@admin_bp.get("/drivers")
@roles_required("admin")
def list_drivers():
    return jsonify([d.to_dict() for d in Driver.query.order_by(Driver.id.desc()).all()]), 200


@admin_bp.post("/drivers")
@roles_required("admin")
def add_driver():
    data = request.get_json(silent=True) or {}
    required = ["username", "password", "full_name", "mobile_number"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        driver = create_driver(
            username=data["username"],
            password=data["password"],
            full_name=data["full_name"],
            mobile_number=data["mobile_number"],
            licence_number=data.get("licence_number"),
        )
    except OnboardingError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(driver.to_dict()), 201


@admin_bp.patch("/drivers/<int:driver_id>")
@roles_required("admin")
def update_driver(driver_id):
    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify({"error": "Driver not found"}), 404

    data = request.get_json(silent=True) or {}
    if "status" in data:
        if data["status"] not in ("available", "on_trip", "offline", "emergency"):
            return jsonify({"error": "Invalid status"}), 400
        driver.status = data["status"]
    for field in ("full_name", "mobile_number", "licence_number", "assigned_vehicle_id"):
        if field in data:
            setattr(driver, field, data[field])

    db.session.commit()
    return jsonify(driver.to_dict()), 200


# ----------------------------------------------------------------- Vehicles

@admin_bp.get("/vehicles")
@roles_required("admin")
def list_vehicles():
    return jsonify([v.to_dict() for v in Vehicle.query.order_by(Vehicle.id.desc()).all()]), 200


@admin_bp.post("/vehicles")
@roles_required("admin")
def add_vehicle():
    data = request.get_json(silent=True) or {}
    if not data.get("vehicle_number") or not data.get("capacity_kg"):
        return jsonify({"error": "vehicle_number and capacity_kg are required"}), 400

    if Vehicle.query.filter_by(vehicle_number=data["vehicle_number"]).first():
        return jsonify({"error": "Vehicle number already exists"}), 400

    vehicle = Vehicle(
        vehicle_number=data["vehicle_number"],
        capacity_kg=data["capacity_kg"],
        is_backup=bool(data.get("is_backup", False)),
    )
    db.session.add(vehicle)
    db.session.commit()
    return jsonify(vehicle.to_dict()), 201


@admin_bp.patch("/vehicles/<int:vehicle_id>")
@roles_required("admin")
def update_vehicle(vehicle_id):
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify({"error": "Vehicle not found"}), 404

    data = request.get_json(silent=True) or {}
    if "status" in data:
        valid = ("available", "loading", "on_trip", "maintenance", "emergency", "offline")
        if data["status"] not in valid:
            return jsonify({"error": "Invalid status"}), 400
        vehicle.status = data["status"]
    for field in ("capacity_kg", "is_backup"):
        if field in data:
            setattr(vehicle, field, data[field])

    db.session.commit()
    return jsonify(vehicle.to_dict()), 200


# -------------------------------------------------------------------- Areas

@admin_bp.get("/areas")
@roles_required("admin")
def list_areas():
    return jsonify([a.to_dict() for a in Area.query.order_by(Area.name).all()]), 200


@admin_bp.post("/areas")
@roles_required("admin")
def add_area():
    data = request.get_json(silent=True) or {}
    if not data.get("name"):
        return jsonify({"error": "name is required"}), 400
    if Area.query.filter_by(name=data["name"]).first():
        return jsonify({"error": "Area already exists"}), 400

    area = Area(name=data["name"], region=data.get("region"))
    db.session.add(area)
    db.session.commit()
    return jsonify(area.to_dict()), 201


# --------------------------------------------------------------- ChickenRate

@admin_bp.get("/chicken-rate")
@roles_required("admin")
def rate_history():
    rates = ChickenRate.query.order_by(ChickenRate.rate_date.desc()).limit(60).all()
    return jsonify([r.to_dict() for r in rates]), 200


@admin_bp.post("/chicken-rate")
@roles_required("admin")
def set_rate():
    data = request.get_json(silent=True) or {}
    rate_per_kg = data.get("rate_per_kg")
    if rate_per_kg is None or float(rate_per_kg) <= 0:
        return jsonify({"error": "rate_per_kg must be a positive number"}), 400

    rate_date = date.today()
    existing = ChickenRate.query.filter_by(rate_date=rate_date).first()
    user_id = int(get_jwt_identity())

    if existing:
        existing.rate_per_kg = float(rate_per_kg)
        existing.set_by_user_id = user_id
        db.session.commit()
        return jsonify(existing.to_dict()), 200

    rate = ChickenRate(rate_date=rate_date, rate_per_kg=float(rate_per_kg), set_by_user_id=user_id)
    db.session.add(rate)
    db.session.commit()
    return jsonify(rate.to_dict()), 201


# ------------------------------------------------------------------- Orders

@admin_bp.get("/orders")
@roles_required("admin")
def list_orders():
    query = Order.query
    status = request.args.get("status")
    area_id = request.args.get("area_id")
    if status:
        query = query.filter_by(status=status)
    if area_id:
        query = query.filter_by(area_id=area_id)
    orders = query.order_by(Order.id.desc()).limit(200).all()
    return jsonify([o.to_dict() for o in orders]), 200


@admin_bp.patch("/orders/<int:order_id>")
@roles_required("admin")
def update_order_status(order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    from app.models.order import ORDER_STATUSES

    if new_status not in ORDER_STATUSES:
        return jsonify({"error": "Invalid status"}), 400

    order.status = new_status
    db.session.commit()
    return jsonify(order.to_dict()), 200


@admin_bp.get("/orders/area-summary")
@roles_required("admin")
def orders_area_summary():
    """Section 8: confirmed orders grouped area-wise, e.g. Panaji -> 1600 KG."""
    target_date = request.args.get("date")
    parsed_date = date.fromisoformat(target_date) if target_date else None
    return jsonify(area_wise_demand(target_date=parsed_date)), 200


# -------------------------------------------------------------------- Routes

@admin_bp.get("/routes")
@roles_required("admin")
def list_routes():
    return jsonify([r.to_dict() for r in Route.query.order_by(Route.name).all()]), 200


@admin_bp.post("/routes")
@roles_required("admin")
def add_route():
    data = request.get_json(silent=True) or {}
    if not data.get("name"):
        return jsonify({"error": "name is required"}), 400
    if Route.query.filter_by(name=data["name"]).first():
        return jsonify({"error": "Route already exists"}), 400

    route = Route(name=data["name"], source=data.get("source"), region=data.get("region"))
    db.session.add(route)
    db.session.flush()

    area_ids = data.get("area_ids", [])
    for i, area_id in enumerate(area_ids):
        area = Area.query.get(area_id)
        if area:
            area.route_id = route.id
            area.route_sequence = i + 1

    db.session.commit()
    return jsonify(route.to_dict()), 201


@admin_bp.patch("/routes/<int:route_id>")
@roles_required("admin")
def update_route(route_id):
    route = Route.query.get(route_id)
    if not route:
        return jsonify({"error": "Route not found"}), 404

    data = request.get_json(silent=True) or {}
    for field in ("name", "source", "region"):
        if field in data:
            setattr(route, field, data[field])

    if "area_ids" in data:
        # Clear old membership, then reassign in the new order
        for area in Area.query.filter_by(route_id=route.id).all():
            area.route_id = None
            area.route_sequence = 0
        for i, area_id in enumerate(data["area_ids"]):
            area = Area.query.get(area_id)
            if area:
                area.route_id = route.id
                area.route_sequence = i + 1

    db.session.commit()
    return jsonify(route.to_dict()), 200


# --------------------------------------------------------------------- Trips

@admin_bp.get("/trips")
@roles_required("admin")
def list_trips():
    target_date = request.args.get("date")
    query = Trip.query
    if target_date:
        query = query.filter_by(delivery_date=date.fromisoformat(target_date))
    trips = query.order_by(Trip.id.desc()).limit(100).all()
    return jsonify([t.to_dict() for t in trips]), 200


@admin_bp.get("/trips/<int:trip_id>")
@roles_required("admin")
def get_trip(trip_id):
    trip = Trip.query.get(trip_id)
    if not trip:
        return jsonify({"error": "Trip not found"}), 404
    return jsonify(trip.to_dict()), 200


@admin_bp.post("/dispatch/run")
@roles_required("admin")
def dispatch_run():
    """
    Runs the full Phase 3 flow for a given date (default today): area-wise
    grouping -> route grouping -> capacity-aware vehicle packing -> fair
    driver rotation. Admin can still manually reassign afterwards.
    """
    data = request.get_json(silent=True) or {}
    target_date = data.get("date")
    parsed_date = date.fromisoformat(target_date) if target_date else None

    try:
        result = run_dispatch(target_date=parsed_date)
    except DispatchError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(result), 200


# ------------------------------------------------------------------ FareRate

@admin_bp.get("/fare-rate")
@roles_required("admin")
def fare_rate_history():
    rates = FareRate.query.order_by(FareRate.rate_date.desc()).limit(60).all()
    return jsonify([r.to_dict() for r in rates]), 200


@admin_bp.post("/fare-rate")
@roles_required("admin")
def set_fare_rate():
    """
    Sets today's two SEPARATE rates:
      - rate_per_kg_loss: ₹ per KG of weight loss (penalty/recovery record)
      - driver_fare_rate_per_kg: ₹ per KG delivered (the driver's actual fare)
    Either can be provided independently; an existing today's row keeps its
    other rate unchanged if only one is sent.
    """
    data = request.get_json(silent=True) or {}
    rate_per_kg_loss = data.get("rate_per_kg_loss")
    driver_fare_rate_per_kg = data.get("driver_fare_rate_per_kg")

    if rate_per_kg_loss is None and driver_fare_rate_per_kg is None:
        return jsonify({"error": "Provide rate_per_kg_loss and/or driver_fare_rate_per_kg"}), 400
    if rate_per_kg_loss is not None and float(rate_per_kg_loss) <= 0:
        return jsonify({"error": "rate_per_kg_loss must be a positive number"}), 400
    if driver_fare_rate_per_kg is not None and float(driver_fare_rate_per_kg) <= 0:
        return jsonify({"error": "driver_fare_rate_per_kg must be a positive number"}), 400

    rate_date = date.today()
    existing = FareRate.query.filter_by(rate_date=rate_date).first()
    user_id = int(get_jwt_identity())

    if existing:
        if rate_per_kg_loss is not None:
            existing.rate_per_kg_loss = float(rate_per_kg_loss)
        if driver_fare_rate_per_kg is not None:
            existing.driver_fare_rate_per_kg = float(driver_fare_rate_per_kg)
        existing.set_by_user_id = user_id
        db.session.commit()
        return jsonify(existing.to_dict()), 200

    if rate_per_kg_loss is None or driver_fare_rate_per_kg is None:
        return jsonify({"error": "Both rate_per_kg_loss and driver_fare_rate_per_kg are required to create the first rate"}), 400

    rate = FareRate(
        rate_date=rate_date,
        rate_per_kg_loss=float(rate_per_kg_loss),
        driver_fare_rate_per_kg=float(driver_fare_rate_per_kg),
        set_by_user_id=user_id,
    )
    db.session.add(rate)
    db.session.commit()
    return jsonify(rate.to_dict()), 201


# --------------------------------------------------------- Weight loss & fares

@admin_bp.get("/weight-loss")
@roles_required("admin")
def weight_loss_report():
    """Driver-wise / vehicle-wise / route-wise weight loss, for analysis and high-loss alerts."""
    records = (
        WeightRecord.query.join(Trip, WeightRecord.trip_id == Trip.id)
        .filter(WeightRecord.delivery_weight_kg.isnot(None))
        .order_by(Trip.id.desc())
        .limit(100)
        .all()
    )
    result = []
    for r in records:
        trip = r.trip
        fare = trip.driver_fare  # one-to-one; None if not yet computed
        result.append(
            {
                **r.to_dict(),
                "trip_code": trip.trip_code,
                "driver_name": trip.driver.full_name if trip.driver else None,
                "vehicle_number": trip.vehicle.vehicle_number if trip.vehicle else None,
                "route_name": trip.route.name if trip.route else None,
                "delivery_date": trip.delivery_date.isoformat(),
                "high_loss_alert": (r.weight_loss_percent or 0) > 5.0,
                "weight_loss_amount": fare.weight_loss_amount if fare else None,
                "driver_fare_amount": fare.fare_amount if fare else None,
            }
        )
    return jsonify(result), 200


@admin_bp.get("/driver-fares")
@roles_required("admin")
def all_driver_fares():
    fares = DriverFare.query.order_by(DriverFare.id.desc()).limit(100).all()
    result = []
    for f in fares:
        result.append(
            {
                **f.to_dict(),
                "driver_name": f.driver.full_name if f.driver else None,
            }
        )
    return jsonify(result), 200



# --------------------------------------------------------------- Emergencies

@admin_bp.get("/emergencies")
@roles_required("admin")
def list_emergencies():
    status = request.args.get("status")
    query = EmergencyCase.query
    if status:
        query = query.filter_by(status=status)
    cases = query.order_by(EmergencyCase.id.desc()).limit(100).all()
    return jsonify([c.to_dict() for c in cases]), 200


@admin_bp.post("/emergencies/<int:case_id>/assign-backup")
@roles_required("admin")
def assign_emergency_backup(case_id):
    case = EmergencyCase.query.get(case_id)
    if not case:
        return jsonify({"error": "Emergency case not found"}), 404

    try:
        assignment = assign_backup(case)
    except EmergencyError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({"emergency_case": case.to_dict(), "backup_assignment": assignment.to_dict()}), 200


@admin_bp.patch("/emergencies/<int:case_id>")
@roles_required("admin")
def resolve_emergency_case(case_id):
    case = EmergencyCase.query.get(case_id)
    if not case:
        return jsonify({"error": "Emergency case not found"}), 404

    try:
        resolve_emergency(case)
    except EmergencyError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(case.to_dict()), 200


# ------------------------------------------------------------- Notifications

@admin_bp.get("/notifications")
@roles_required("admin")
def notifications():
    """Always scoped to the logged-in admin's own user id — each admin has independent read state."""
    user_id = int(get_jwt_identity())
    items, unread_count = list_for_user(user_id)
    return jsonify({"notifications": [n.to_dict() for n in items], "unread_count": unread_count}), 200


@admin_bp.patch("/notifications/<int:notification_id>/read")
@roles_required("admin")
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


@admin_bp.post("/notifications/read-all")
@roles_required("admin")
def mark_all_notifications_read():
    user_id = int(get_jwt_identity())
    count = mark_all_read(user_id)
    return jsonify({"marked_read": count}), 200


# ------------------------------------------------------------------ Payments

@admin_bp.get("/payments")
@roles_required("admin")
def list_payments():
    payments = Payment.query.order_by(Payment.id.desc()).limit(200).all()
    return jsonify([p.to_dict() for p in payments]), 200


@admin_bp.get("/orders/<int:order_id>/payments")
@roles_required("admin")
def order_payments(order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    return jsonify(
        {
            "summary": get_payment_summary(order),
            "payments": [p.to_dict() for p in order.payments],
        }
    ), 200


@admin_bp.post("/orders/<int:order_id>/payments")
@roles_required("admin")
def add_order_payment(order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    data = request.get_json(silent=True) or {}
    try:
        payment = record_payment(
            order=order,
            amount=data.get("amount"),
            method=data.get("method", "cash"),
            notes=data.get("notes"),
            recorded_by_user_id=int(get_jwt_identity()),
        )
    except PaymentError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({"payment": payment.to_dict(), "summary": get_payment_summary(order)}), 201


# ------------------------------------------------------------------ Invoices

@admin_bp.get("/invoices")
@roles_required("admin")
def list_invoices():
    invoices = Invoice.query.order_by(Invoice.id.desc()).limit(200).all()
    return jsonify([inv.to_dict(get_payment_summary(inv.order)) for inv in invoices]), 200


@admin_bp.post("/orders/<int:order_id>/invoice")
@roles_required("admin")
def create_order_invoice(order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    try:
        invoice = generate_invoice(order)
    except InvoiceError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(invoice.to_dict(get_payment_summary(order))), 201


@admin_bp.get("/orders/<int:order_id>/invoice")
@roles_required("admin")
def get_order_invoice(order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    if not order.invoice:
        return jsonify({"error": "No invoice generated for this order yet"}), 404

    return jsonify(order.invoice.to_dict(get_payment_summary(order))), 200


# ----------------------------------------------------------------- Analytics

@admin_bp.get("/analytics")
@roles_required("admin")
def analytics_dashboard():
    """
    Everything the analytics page charts: daily sales, area/retailer
    demand, vehicle/driver performance, weight-loss trend, order status
    breakdown, emergency stats, chicken-rate history, payments summary.
    All computed live from the database — nothing hard-coded.
    """
    return jsonify(analytics_service.full_dashboard()), 200
