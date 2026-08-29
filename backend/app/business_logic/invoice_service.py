from app import db
from app.models.invoice import Invoice


class InvoiceError(Exception):
    """Raised for invoice business rule violations. Route layer converts to 4xx."""


def _next_invoice_number():
    count = Invoice.query.count()
    return f"INV-{count + 1:05d}"


def generate_invoice(order):
    """
    Section 23: generate a digital invoice for a completed (delivered)
    order. Idempotent — calling this again for the same order just returns
    the existing invoice rather than creating a duplicate.
    """
    if order.invoice:
        return order.invoice

    if order.status != "delivered":
        raise InvoiceError("An invoice can only be generated for a delivered order")

    invoice = Invoice(invoice_number=_next_invoice_number(), order_id=order.id)
    db.session.add(invoice)
    db.session.commit()
    return invoice
