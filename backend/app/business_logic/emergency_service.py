from datetime import datetime

from app import db
from app.models.emergency_case import EmergencyCase
from app.models.backup_assignment import BackupAssignment
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.business_logic.notification_service import notify_admins, notify_driver


class EmergencyError(Exception):
    """Raised for emergency/backup business rule violations. Route layer converts to 4xx."""


def _route_label(trip):
    if trip.route and trip.route.areas:
        stops = " -> ".join(a.name for a in sorted(trip.route.areas, key=lambda a: a.route_sequence or 0))
        return f"{trip.route.source or trip.route.name} -> {stops}"
    return trip.route.name if trip.route else "Unrouted"


def report_emergency(trip, driver, problem_type, location=None, notes=None):
    """
    Section 13: driver presses Emergency/Request Backup. The trip is NOT
    cancelled — it's flagged so Admin can find a backup vehicle and driver
    and continue the delivery with the remaining load.

    Notifies every Admin the moment the case is created (Admin MUST receive
    this notification), and creates a full audit record via EmergencyCase
    itself (reported_at, problem_type, location, notes — all preserved
    regardless of what happens next).
    """
    if trip.status not in ("loaded", "in_transit"):
        raise EmergencyError(f"Trip must be loaded or in transit to report an emergency — currently '{trip.status}'")

    case = EmergencyCase(
        trip_id=trip.id,
        driver_id=driver.id,
        vehicle_id=trip.vehicle_id,
        problem_type=problem_type,
        location=location,
        notes=notes,
        load_remaining_kg=trip.total_weight_kg,
        status="reported",
    )
    db.session.add(case)
    db.session.flush()  # get case.id for the notification's related_emergency_id

    trip.status = "emergency"
    driver.status = "emergency"
    trip.vehicle.status = "emergency"
    for trip_order in trip.trip_orders:
        trip_order.order.status = "emergency"

    route_label = _route_label(trip)
    notify_admins(
        notification_type="EMERGENCY_REPORTED",
        title="Emergency reported",
        message=(
            f"Driver {driver.full_name} reported {problem_type.replace('_', ' ')} on {trip.trip_code} "
            f"({route_label}), vehicle {trip.vehicle.vehicle_number}."
        ),
        related_emergency_id=case.id,
        related_trip_id=trip.id,
    )

    db.session.commit()
    return case


def assign_backup(emergency_case):
    """
    Section 14: find a suitable AVAILABLE backup vehicle with enough
    capacity for the remaining load, and an available driver — excluding
    the original emergency driver and anyone already on another active
    trip — using the same fair rotation as normal dispatch. Transfers the
    load and resumes the SAME trip (never cancels it, never duplicates
    orders: Trip.trip_orders is untouched, only vehicle_id/driver_id move).

    If no backup vehicle or driver is available, the case is marked
    'no_backup_available' and Admin is notified — it is NOT silently left
    as 'reported' with just an exception.

    MVP simplification: "nearest" is approximated by lowest vehicle id
    among available backups (stand-in for real distance until Phase 7's
    GPS/maps integration); capacity is enforced exactly as specified.
    """
    if emergency_case.status not in ("reported", "no_backup_available"):
        raise EmergencyError(f"Emergency is already '{emergency_case.status}'")

    trip = emergency_case.trip

    backup_vehicle = (
        Vehicle.query.filter(
            Vehicle.is_backup.is_(True),
            Vehicle.status == "available",
            Vehicle.capacity_kg >= emergency_case.load_remaining_kg,
        )
        .order_by(Vehicle.id.asc())
        .first()
    )

    # "currently on another active trip" == status != 'available'; excluding
    # the original driver is enforced explicitly even though their status is
    # already 'emergency' (defensive, in case that ever changes).
    backup_driver = (
        Driver.query.filter(
            Driver.status == "available",
            Driver.id != emergency_case.driver_id,
        )
        .order_by(Driver.rotation_position.asc(), Driver.id.asc())
        .first()
    )

    if not backup_vehicle or not backup_driver:
        emergency_case.status = "no_backup_available"
        reason = "no available backup vehicle with enough capacity" if not backup_vehicle else "no available backup driver"
        notify_admins(
            notification_type="EMERGENCY_NO_BACKUP_AVAILABLE",
            title="No backup driver available",
            message=f"Could not assign a backup for {trip.trip_code} — {reason}. Please assign manually once one frees up.",
            related_emergency_id=emergency_case.id,
            related_trip_id=trip.id,
        )
        db.session.commit()
        raise EmergencyError(f"No available backup — {reason}")

    max_position = db.session.query(db.func.max(Driver.rotation_position)).scalar() or 0

    assignment = BackupAssignment(
        emergency_case_id=emergency_case.id,
        backup_vehicle_id=backup_vehicle.id,
        backup_driver_id=backup_driver.id,
        load_transferred_kg=emergency_case.load_remaining_kg,
    )
    db.session.add(assignment)

    # Transfer: the SAME trip (same id, same trip_orders — no duplication)
    # now continues under the backup vehicle/driver. The original driver_id
    # stays recorded on EmergencyCase.driver_id for audit.
    trip.vehicle_id = backup_vehicle.id
    trip.driver_id = backup_driver.id
    trip.status = "in_transit"

    backup_vehicle.status = "on_trip"
    backup_driver.status = "on_trip"
    backup_driver.rotation_position = max_position + 1
    backup_driver.last_trip_at = datetime.utcnow()

    for trip_order in trip.trip_orders:
        trip_order.order.status = "in_transit"

    emergency_case.status = "backup_assigned"

    route_label = _route_label(trip)
    order_count = len(trip.trip_orders)

    notify_driver(
        backup_driver,
        notification_type="EMERGENCY_BACKUP_ASSIGNED",
        title="Emergency trip assigned to you",
        message=(
            f"You've been assigned as backup driver for {trip.trip_code} ({route_label}), "
            f"originally driven by {emergency_case.driver.full_name}. "
            f"{order_count} order(s), {emergency_case.load_remaining_kg} KG total. Please take over this trip."
        ),
        related_emergency_id=emergency_case.id,
        related_trip_id=trip.id,
    )
    # Admin SHOULD also get confirmation a backup was assigned
    notify_admins(
        notification_type="EMERGENCY_BACKUP_ASSIGNED",
        title="Backup driver assigned",
        message=f"{backup_driver.full_name} assigned as backup on {trip.trip_code}, vehicle {backup_vehicle.vehicle_number}.",
        related_emergency_id=emergency_case.id,
        related_trip_id=trip.id,
    )

    db.session.commit()
    return assignment


def accept_backup(emergency_case, driver):
    """
    Backup driver confirms they're taking over the emergency trip. Only the
    driver actually named on the BackupAssignment may accept it.
    """
    assignment = emergency_case.backup_assignment
    if not assignment or assignment.backup_driver_id != driver.id:
        raise EmergencyError("You are not the assigned backup driver for this emergency")
    if emergency_case.status != "backup_assigned":
        raise EmergencyError(f"Emergency must be 'backup_assigned' to accept — currently '{emergency_case.status}'")

    emergency_case.accepted_at = datetime.utcnow()
    db.session.commit()
    return emergency_case


def resolve_emergency(emergency_case):
    """
    Admin closes out the case once the original vehicle/driver situation is
    sorted (e.g. vehicle repaired, driver cleared) — frees them back into the
    available pool. Does not touch the trip, which is already progressing
    under the backup by this point (or was never blocked if resolved without
    a backup, e.g. a false alarm).

    Notifies Admin, plus the original driver and backup driver (where a
    backup exists) — never anyone unrelated to this case.
    """
    if emergency_case.status == "resolved":
        raise EmergencyError("Emergency is already resolved")

    emergency_case.status = "resolved"
    emergency_case.resolved_at = datetime.utcnow()

    # Only reset the ORIGINAL driver/vehicle — if a backup already took over
    # the trip, the backup's own status is managed by normal trip completion.
    if emergency_case.driver.status == "emergency":
        emergency_case.driver.status = "available"
    if emergency_case.vehicle.status == "emergency":
        emergency_case.vehicle.status = "available"

    trip = emergency_case.trip
    notify_admins(
        notification_type="EMERGENCY_RESOLVED",
        title="Emergency resolved",
        message=f"Emergency on {trip.trip_code} ({emergency_case.problem_type.replace('_', ' ')}) has been resolved.",
        related_emergency_id=emergency_case.id,
        related_trip_id=trip.id,
    )
    notify_driver(
        emergency_case.driver,
        notification_type="EMERGENCY_RESOLVED",
        title="Emergency resolved",
        message=f"Your emergency on {trip.trip_code} has been marked resolved.",
        related_emergency_id=emergency_case.id,
        related_trip_id=trip.id,
    )
    if emergency_case.backup_assignment:
        notify_driver(
            emergency_case.backup_assignment.backup_driver,
            notification_type="EMERGENCY_RESOLVED",
            title="Emergency resolved",
            message=f"The emergency you backed up on {trip.trip_code} has been marked resolved.",
            related_emergency_id=emergency_case.id,
            related_trip_id=trip.id,
        )

    db.session.commit()
    return emergency_case
