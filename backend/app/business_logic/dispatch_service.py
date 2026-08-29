from collections import defaultdict
from datetime import date, datetime

from app import db
from app.models.order import Order
from app.models.area import Area
from app.models.route import Route
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip, TripOrder


class DispatchError(Exception):
    """Raised for dispatch business rule violations. Route layer converts to 4xx."""


def _next_trip_code():
    count = Trip.query.count()
    return f"TRIP-{count + 1:05d}"


def area_wise_demand(target_date=None, status="confirmed"):
    """
    Section 8 of the spec: every confirmed order grouped by delivery area,
    e.g. Panaji -> 1600 KG, Old Goa -> 900 KG. Used both to preview demand
    before dispatch and to drive the packing algorithm.
    """
    target_date = target_date or date.today()
    orders = Order.query.filter_by(delivery_date=target_date, status=status).all()

    by_area = defaultdict(lambda: {"quantity_kg": 0, "order_count": 0, "orders": []})
    for o in orders:
        key = o.area_id
        by_area[key]["quantity_kg"] += o.quantity_kg
        by_area[key]["order_count"] += 1
        by_area[key]["orders"].append(o)

    result = []
    for area_id, data in by_area.items():
        area = Area.query.get(area_id)
        result.append(
            {
                "area_id": area_id,
                "area_name": area.name if area else "Unknown",
                "route_id": area.route_id if area else None,
                "route_name": area.route.name if area and area.route else None,
                "quantity_kg": data["quantity_kg"],
                "order_count": data["order_count"],
            }
        )
    return sorted(result, key=lambda r: -r["quantity_kg"])


def _pack_orders_into_vehicles(route, orders, target_date):
    """
    Business rule #8: don't activate a second vehicle while the current one
    still has usable capacity for the route. This greedily fills each
    vehicle (largest-capacity first) before moving to the next one, rather
    than splitting a route across vehicles unnecessarily.
    """
    vehicles = (
        Vehicle.query.filter_by(status="available", is_backup=False)
        .order_by(Vehicle.capacity_kg.desc())
        .all()
    )
    if not vehicles:
        raise DispatchError("No available vehicles — cannot dispatch")

    trips = []
    vehicle_idx = -1
    current_trip = None
    current_vehicle = None
    current_load = 0
    sequence_in_trip = 0

    for order in orders:
        needs_new_vehicle = current_trip is None or (current_load + order.quantity_kg) > current_vehicle.capacity_kg

        if needs_new_vehicle:
            vehicle_idx += 1
            if vehicle_idx >= len(vehicles):
                raise DispatchError(
                    f"Not enough available vehicle capacity to cover route '{route.name if route else 'Unrouted'}' demand"
                )
            current_vehicle = vehicles[vehicle_idx]
            current_trip = Trip(
                trip_code=_next_trip_code(),
                route_id=route.id if route else None,
                vehicle_id=current_vehicle.id,
                delivery_date=target_date,
                total_weight_kg=0,
                status="vehicle_assigned",
            )
            db.session.add(current_trip)
            trips.append(current_trip)
            current_vehicle.status = "loading"
            current_load = 0
            sequence_in_trip = 0

        # Append via the ORM relationship (not a raw trip_id assignment) so
        # current_trip.trip_orders stays in sync in-memory — mixing direct
        # FK writes with relationship reads causes SQLAlchemy to cache a
        # stale collection and silently skip later status updates.
        sequence_in_trip += 1
        trip_order = TripOrder(order_id=order.id, delivery_sequence=sequence_in_trip)
        current_trip.trip_orders.append(trip_order)

        current_load += order.quantity_kg
        current_trip.total_weight_kg = current_load
        order.status = "vehicle_assigned"

    return trips


def _assign_driver_rotation(trip):
    """
    Fair round-robin: pick the available driver who has been waiting
    longest (lowest rotation_position), then send them to the back of the
    queue. Unavailable drivers are skipped, not removed from rotation.
    """
    driver = (
        Driver.query.filter_by(status="available")
        .order_by(Driver.rotation_position.asc(), Driver.id.asc())
        .first()
    )
    if not driver:
        raise DispatchError("No available driver for rotation assignment")

    max_position = db.session.query(db.func.max(Driver.rotation_position)).scalar() or 0

    trip.driver_id = driver.id
    trip.status = "driver_assigned"
    driver.status = "on_trip"
    driver.rotation_position = max_position + 1
    driver.last_trip_at = datetime.utcnow()

    for trip_order in trip.trip_orders:
        trip_order.order.status = "driver_assigned"


def run_dispatch(target_date=None):
    """
    Full Phase 3 flow: group confirmed orders by area -> group areas into
    routes -> pack each route's orders into vehicles by capacity -> assign
    a driver to each resulting trip by fair rotation.
    """
    target_date = target_date or date.today()

    orders = (
        Order.query.filter_by(delivery_date=target_date, status="confirmed")
        .join(Area, Order.area_id == Area.id)
        .all()
    )
    if not orders:
        raise DispatchError("No confirmed orders for this date — nothing to dispatch")

    by_route = defaultdict(list)
    unrouted_orders = []
    for o in orders:
        if o.area and o.area.route_id:
            by_route[o.area.route_id].append(o)
        else:
            unrouted_orders.append(o)

    all_trips = []
    errors = []

    for route_id, route_orders in by_route.items():
        route = Route.query.get(route_id)
        route_orders.sort(key=lambda o: (o.area.route_sequence or 0, o.id))
        try:
            all_trips.extend(_pack_orders_into_vehicles(route, route_orders, target_date))
        except DispatchError as e:
            errors.append(str(e))

    db.session.flush()

    for trip in all_trips:
        try:
            _assign_driver_rotation(trip)
        except DispatchError as e:
            errors.append(f"{trip.trip_code}: {e}")

    db.session.commit()

    return {
        "trips_created": [t.to_dict() for t in all_trips],
        "unrouted_orders": [o.order_code for o in unrouted_orders],
        "errors": errors,
    }
