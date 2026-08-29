from datetime import date

from app import db
from app.models.weight_record import WeightRecord
from app.models.driver_fare import DriverFare
from app.models.fare_rate import FareRate


class TripError(Exception):
    """Raised for trip-lifecycle business rule violations. Route layer converts to 4xx."""


def get_current_fare_rate():
    """Today's fare rate if set, otherwise the most recently configured one."""
    rate = FareRate.query.filter_by(rate_date=date.today()).first()
    if not rate:
        rate = FareRate.query.order_by(FareRate.rate_date.desc()).first()
    return rate


def record_loading(trip, loading_weight_kg):
    """
    Driver confirms the vehicle is loaded. Captures the actual loading
    weight (may differ slightly from the sum of order quantities) and
    advances the trip + its orders to 'loaded'.
    """
    if trip.status != "driver_assigned":
        raise TripError(f"Trip must be 'driver_assigned' to load — currently '{trip.status}'")
    if loading_weight_kg is None or loading_weight_kg <= 0:
        raise TripError("Loading weight must be greater than 0 KG")

    record = trip.weight_record or WeightRecord(trip_id=trip.id)
    record.loading_weight_kg = loading_weight_kg
    db.session.add(record)

    trip.status = "loaded"
    trip.vehicle.status = "on_trip"
    for trip_order in trip.trip_orders:
        trip_order.order.status = "loaded"

    db.session.commit()
    return record


def start_transit(trip):
    """Driver departs for the delivery areas."""
    if trip.status != "loaded":
        raise TripError(f"Trip must be 'loaded' to start transit — currently '{trip.status}'")

    trip.status = "in_transit"
    for trip_order in trip.trip_orders:
        trip_order.order.status = "in_transit"

    db.session.commit()
    return trip


def record_delivery(trip, delivery_weight_kg):
    """
    Driver confirms delivery is complete. Computes TWO SEPARATE records:

      1. Weight loss + weight-loss amount (a penalty/recovery record):
         weight_loss = loading_weight - delivery_weight
         weight_loss_amount = weight_loss x weight_loss_rate

      2. Driver fare (the driver's actual pay), based ONLY on delivered
         weight — never on loaded weight and never on the weight-loss
         amount:
         driver_fare = delivery_weight x driver_fare_rate

    Both rates are snapshotted at this moment so a later admin rate change
    never rewrites an already-completed trip's numbers.

    Frees the vehicle and driver back into the available pool so they
    re-enter rotation.
    """
    if trip.status not in ("loaded", "in_transit"):
        raise TripError(f"Trip must be loaded or in transit to record delivery — currently '{trip.status}'")

    record = trip.weight_record
    if not record or record.loading_weight_kg is None:
        raise TripError("Loading weight was never recorded for this trip")
    if delivery_weight_kg is None or delivery_weight_kg <= 0:
        raise TripError("Delivery weight must be greater than 0 KG")
    if delivery_weight_kg > record.loading_weight_kg:
        raise TripError("Delivery weight cannot exceed loading weight")

    record.delivery_weight_kg = delivery_weight_kg
    weight_loss = record.weight_loss_kg  # computed property: loading - delivery, never negative here

    fare_rate = get_current_fare_rate()
    if not fare_rate:
        raise TripError("No fare rate has been set by Admin yet")
    if not fare_rate.driver_fare_rate_per_kg:
        raise TripError("No driver fare rate (₹/KG delivered) has been set by Admin yet")

    weight_loss_amount = round(weight_loss * fare_rate.rate_per_kg_loss, 2)
    fare_amount = round(delivery_weight_kg * fare_rate.driver_fare_rate_per_kg, 2)  # delivered weight ONLY

    fare = DriverFare(
        trip_id=trip.id,
        driver_id=trip.driver_id,
        weight_loss_kg=weight_loss,
        weight_loss_rate_per_kg=fare_rate.rate_per_kg_loss,          # snapshot — never changes later
        weight_loss_amount=weight_loss_amount,
        delivered_weight_kg=delivery_weight_kg,
        driver_fare_rate_per_kg=fare_rate.driver_fare_rate_per_kg,   # snapshot — never changes later
        fare_amount=fare_amount,
    )
    db.session.add(fare)

    trip.status = "delivered"
    trip.vehicle.status = "available"
    trip.driver.status = "available"  # back into the rotation pool
    for trip_order in trip.trip_orders:
        trip_order.order.status = "delivered"

    db.session.commit()

    high_loss_alert = record.weight_loss_percent is not None and record.weight_loss_percent > 5.0
    return record, fare, high_loss_alert
