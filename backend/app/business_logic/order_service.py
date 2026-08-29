from datetime import date

from app import db
from app.models.order import Order
from app.models.chicken_rate import ChickenRate
from app.models.area import Area


class OrderError(Exception):
    """Raised for order-placement business rule violations. Route layer converts to 4xx."""


def _next_order_code():
    count = Order.query.count()
    return f"ORD-{count + 1:05d}"


def get_current_rate():
    """Returns today's rate if set, otherwise the most recently set rate (never blocks ordering
    just because Admin forgot to re-enter an unchanged price)."""
    rate = ChickenRate.query.filter_by(rate_date=date.today()).first()
    if not rate:
        rate = ChickenRate.query.order_by(ChickenRate.rate_date.desc()).first()
    return rate


def place_order(retailer, area_id, quantity_kg, delivery_date=None, product="Broiler Chicken"):
    """
    Creates an order with the chicken rate SNAPSHOTTED at this moment.
    Rule: once created, an order's rate_per_kg/total_amount never change,
    even if the daily rate is updated afterwards.
    """
    if quantity_kg is None or quantity_kg <= 0:
        raise OrderError("Quantity must be greater than 0 KG")

    area = Area.query.get(area_id)
    if not area:
        raise OrderError("Invalid delivery area")

    current_rate = get_current_rate()
    if not current_rate:
        raise OrderError("No chicken rate has been set by Admin yet — cannot place order")

    total_amount = round(quantity_kg * current_rate.rate_per_kg, 2)

    order = Order(
        order_code=_next_order_code(),
        retailer_id=retailer.id,
        area_id=area.id,
        product=product,
        quantity_kg=quantity_kg,
        rate_per_kg=current_rate.rate_per_kg,   # <-- snapshot, not a live FK to ChickenRate
        total_amount=total_amount,
        delivery_area_snapshot=area.name,
        delivery_date=delivery_date or date.today(),
        status="placed",
    )
    db.session.add(order)
    db.session.commit()
    return order
