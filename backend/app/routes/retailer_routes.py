from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity

from app.auth.decorators import roles_required
from app.models.user import User
from app.models.chicken_rate import ChickenRate
from app.models.area import Area
from app.models.order import Order
from app.business_logic.order_service import place_order, get_current_rate, OrderError
from app.business_logic.payment_service import get_payment_summary

retailer_bp = Blueprint("retailer", __name__)


def _current_retailer():
    """Resolves the logged-in user's own retailer profile. Never trust a retailer_id from the request."""
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    return user.retailer_profile if user else None


@retailer_bp.get("/profile")
@roles_required("retailer")
def profile():
    retailer = _current_retailer()
    if not retailer:
        return jsonify({"error": "Retailer profile not found"}), 404
    return jsonify(retailer.to_dict()), 200


@retailer_bp.get("/current-rate")
@roles_required("retailer")
def current_rate():
    latest_rate = get_current_rate()
    if not latest_rate:
        return jsonify({"error": "No chicken rate has been set yet"}), 404
    return jsonify(latest_rate.to_dict()), 200


@retailer_bp.get("/areas")
@roles_required("retailer")
def areas():
    """Retailers need the area list to pick a delivery area when ordering."""
    return jsonify([a.to_dict() for a in Area.query.order_by(Area.name).all()]), 200


@retailer_bp.post("/orders")
@roles_required("retailer")
def create_order():
    retailer = _current_retailer()
    if not retailer:
        return jsonify({"error": "Retailer profile not found"}), 404
    if retailer.status != "active":
        return jsonify({"error": "Your account is not active — contact the company"}), 403

    data = request.get_json(silent=True) or {}
    area_id = data.get("area_id")
    quantity_kg = data.get("quantity_kg")

    try:
        order = place_order(
            retailer=retailer,
            area_id=area_id,
            quantity_kg=quantity_kg,
            delivery_date=data.get("delivery_date"),
            product=data.get("product", "Broiler Chicken"),
        )
    except OrderError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(order.to_dict()), 201


@retailer_bp.get("/orders")
@roles_required("retailer")
def list_own_orders():
    """A retailer can only ever see orders tied to THEIR OWN retailer_id —
    the query is scoped server-side, never from a client-supplied id."""
    retailer = _current_retailer()
    if not retailer:
        return jsonify({"error": "Retailer profile not found"}), 404

    orders = Order.query.filter_by(retailer_id=retailer.id).order_by(Order.id.desc()).all()
    return jsonify([o.to_dict() for o in orders]), 200


@retailer_bp.get("/orders/<int:order_id>")
@roles_required("retailer")
def get_own_order(order_id):
    retailer = _current_retailer()
    if not retailer:
        return jsonify({"error": "Retailer profile not found"}), 404

    order = Order.query.filter_by(id=order_id, retailer_id=retailer.id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
    return jsonify(order.to_dict()), 200


@retailer_bp.get("/payments")
@roles_required("retailer")
def own_payments():
    """
    A retailer's own payment position: every order with its total/paid/
    pending, plus running totals — scoped server-side to their own
    retailer_id only.
    """
    retailer = _current_retailer()
    if not retailer:
        return jsonify({"error": "Retailer profile not found"}), 404

    orders = Order.query.filter(
        Order.retailer_id == retailer.id, Order.status != "cancelled"
    ).order_by(Order.id.desc()).all()

    rows = []
    total_billed = 0.0
    total_paid = 0.0
    for o in orders:
        summary = get_payment_summary(o)
        rows.append({"order_code": o.order_code, "order_id": o.id, "delivery_date": o.delivery_date.isoformat(), **summary})
        total_billed += summary["total_amount"]
        total_paid += summary["paid_amount"]

    return jsonify(
        {
            "orders": rows,
            "total_billed": round(total_billed, 2),
            "total_paid": round(total_paid, 2),
            "total_pending": round(total_billed - total_paid, 2),
        }
    ), 200


@retailer_bp.get("/orders/<int:order_id>/invoice")
@roles_required("retailer")
def own_order_invoice(order_id):
    """A retailer can only view an invoice for THEIR OWN order."""
    retailer = _current_retailer()
    if not retailer:
        return jsonify({"error": "Retailer profile not found"}), 404

    order = Order.query.filter_by(id=order_id, retailer_id=retailer.id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
    if not order.invoice:
        return jsonify({"error": "No invoice has been generated for this order yet"}), 404

    return jsonify(order.invoice.to_dict(get_payment_summary(order))), 200
