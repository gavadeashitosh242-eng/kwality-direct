from datetime import date, timedelta
from collections import defaultdict

from app import db
from app.models.order import Order
from app.models.trip import Trip
from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.models.weight_record import WeightRecord
from app.models.driver_fare import DriverFare
from app.models.emergency_case import EmergencyCase
from app.models.chicken_rate import ChickenRate
from app.models.payment import Payment


def sales_trend(days=30):
    """Daily sales (order total_amount) for the last N days — real data, not hard-coded."""
    start = date.today() - timedelta(days=days - 1)
    orders = Order.query.filter(Order.delivery_date >= start).all()

    by_day = defaultdict(lambda: {"total_amount": 0.0, "total_kg": 0.0, "order_count": 0})
    for o in orders:
        key = o.delivery_date.isoformat()
        by_day[key]["total_amount"] += o.total_amount
        by_day[key]["total_kg"] += o.quantity_kg
        by_day[key]["order_count"] += 1

    result = []
    for i in range(days):
        d = (start + timedelta(days=i)).isoformat()
        entry = by_day.get(d, {"total_amount": 0, "total_kg": 0, "order_count": 0})
        result.append({"date": d, **entry})
    return result


def market_demand():
    """Area-wise and retailer-wise demand across ALL orders (not just today — see dispatch_service.area_wise_demand for today-only)."""
    orders = Order.query.all()

    by_area = defaultdict(lambda: {"quantity_kg": 0.0, "order_count": 0})
    by_retailer = defaultdict(lambda: {"quantity_kg": 0.0, "order_count": 0, "total_amount": 0.0})

    for o in orders:
        area_name = o.area.name if o.area else o.delivery_area_snapshot or "Unknown"
        by_area[area_name]["quantity_kg"] += o.quantity_kg
        by_area[area_name]["order_count"] += 1

        retailer_name = o.retailer.shop_name if o.retailer else "Unknown"
        by_retailer[retailer_name]["quantity_kg"] += o.quantity_kg
        by_retailer[retailer_name]["order_count"] += 1
        by_retailer[retailer_name]["total_amount"] += o.total_amount

    return {
        "by_area": sorted(
            [{"area": k, **v} for k, v in by_area.items()], key=lambda x: -x["quantity_kg"]
        ),
        "by_retailer": sorted(
            [{"retailer": k, **v} for k, v in by_retailer.items()], key=lambda x: -x["quantity_kg"]
        )[:10],
    }


def transport_performance():
    """Vehicle utilization and driver trip counts, from real Trip rows."""
    vehicles = Vehicle.query.all()
    vehicle_stats = []
    for v in vehicles:
        trips = [t for t in Trip.query.filter_by(vehicle_id=v.id).all()]
        delivered = [t for t in trips if t.status == "delivered"]
        total_kg = sum(t.total_weight_kg or 0 for t in delivered)
        vehicle_stats.append(
            {
                "vehicle_number": v.vehicle_number,
                "capacity_kg": v.capacity_kg,
                "total_trips": len(trips),
                "completed_trips": len(delivered),
                "total_kg_hauled": total_kg,
                "utilization_percent": round((total_kg / (v.capacity_kg * max(len(delivered), 1))) * 100, 1)
                if delivered
                else 0,
            }
        )

    drivers = Driver.query.all()
    driver_stats = []
    for d in drivers:
        trips = Trip.query.filter_by(driver_id=d.id).all()
        delivered = [t for t in trips if t.status == "delivered"]
        fares = DriverFare.query.filter_by(driver_id=d.id).all()
        driver_stats.append(
            {
                "driver_name": d.full_name,
                "total_trips": len(trips),
                "completed_trips": len(delivered),
                "total_earnings": round(sum(f.fare_amount for f in fares), 2),
            }
        )

    return {"vehicles": vehicle_stats, "drivers": driver_stats}


def weight_loss_trend(days=30):
    """Daily total weight loss across completed trips — for the trend chart."""
    start = date.today() - timedelta(days=days - 1)
    records = (
        WeightRecord.query.join(Trip, WeightRecord.trip_id == Trip.id)
        .filter(Trip.delivery_date >= start, WeightRecord.delivery_weight_kg.isnot(None))
        .all()
    )

    by_day = defaultdict(lambda: {"loading_weight_kg": 0.0, "delivery_weight_kg": 0.0, "weight_loss_kg": 0.0})
    for r in records:
        key = r.trip.delivery_date.isoformat()
        by_day[key]["loading_weight_kg"] += r.loading_weight_kg or 0
        by_day[key]["delivery_weight_kg"] += r.delivery_weight_kg or 0
        by_day[key]["weight_loss_kg"] += r.weight_loss_kg or 0

    result = []
    for i in range(days):
        d = (start + timedelta(days=i)).isoformat()
        entry = by_day.get(d, {"loading_weight_kg": 0, "delivery_weight_kg": 0, "weight_loss_kg": 0})
        result.append({"date": d, **entry})
    return result


def order_status_breakdown():
    rows = db.session.query(Order.status, db.func.count(Order.id)).group_by(Order.status).all()
    return [{"status": status, "count": count} for status, count in rows]


def emergency_stats():
    cases = EmergencyCase.query.all()
    by_type = defaultdict(int)
    for c in cases:
        by_type[c.problem_type] += 1

    return {
        "total_emergencies": len(cases),
        "open_emergencies": len([c for c in cases if c.status != "resolved"]),
        "resolved_emergencies": len([c for c in cases if c.status == "resolved"]),
        "no_backup_available_count": len([c for c in cases if c.status == "no_backup_available"]),
        "by_problem_type": [{"problem_type": k, "count": v} for k, v in by_type.items()],
    }


def pricing_trend(days=60):
    start = date.today() - timedelta(days=days - 1)
    rates = ChickenRate.query.filter(ChickenRate.rate_date >= start).order_by(ChickenRate.rate_date).all()
    return [{"date": r.rate_date.isoformat(), "rate_per_kg": r.rate_per_kg} for r in rates]


def payments_summary():
    orders = Order.query.filter(Order.status != "cancelled").all()
    total_billed = sum(o.total_amount for o in orders)
    total_paid = sum(p.amount for p in Payment.query.all())
    return {
        "total_billed": round(total_billed, 2),
        "total_collected": round(total_paid, 2),
        "total_pending": round(total_billed - total_paid, 2),
    }


def full_dashboard():
    """Everything the analytics page needs in one call — avoids the frontend firing 8 separate requests on load."""
    return {
        "sales_trend": sales_trend(),
        "market_demand": market_demand(),
        "transport_performance": transport_performance(),
        "weight_loss_trend": weight_loss_trend(),
        "order_status_breakdown": order_status_breakdown(),
        "emergency_stats": emergency_stats(),
        "pricing_trend": pricing_trend(),
        "payments_summary": payments_summary(),
    }
