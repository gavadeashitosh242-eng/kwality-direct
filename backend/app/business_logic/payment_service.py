from app import db
from app.models.payment import Payment


class PaymentError(Exception):
    """Raised for payment business rule violations. Route layer converts to 4xx."""


def get_payment_summary(order):
    """
    Always derives paid/pending/status by summing this order's Payment rows
    — never trust a stored 'paid_amount' column that could drift.
    """
    paid_amount = sum(p.amount for p in order.payments) if order.payments else 0
    paid_amount = round(paid_amount, 2)
    pending_amount = round(order.total_amount - paid_amount, 2)

    if paid_amount <= 0:
        status = "unpaid"
    elif pending_amount <= 0:
        status = "paid"
    else:
        status = "partial"

    return {
        "total_amount": order.total_amount,
        "paid_amount": paid_amount,
        "pending_amount": max(pending_amount, 0),
        "status": status,
    }


def record_payment(order, amount, method="cash", notes=None, recorded_by_user_id=None):
    if amount is None or amount <= 0:
        raise PaymentError("Payment amount must be greater than 0")

    summary = get_payment_summary(order)
    if amount > summary["pending_amount"] + 0.01:  # small float tolerance
        raise PaymentError(
            f"Payment of {amount} exceeds the pending amount of {summary['pending_amount']} for this order"
        )

    payment = Payment(
        order_id=order.id,
        retailer_id=order.retailer_id,
        amount=amount,
        method=method,
        notes=notes,
        recorded_by_user_id=recorded_by_user_id,
    )
    db.session.add(payment)
    db.session.commit()
    return payment
