"""
Run with: python seed.py
Creates demo data for local development:
  Admin      -> username: admin       password: admin123
  Retailer 1 -> username: retailer1   password: retailer123
  Retailer 2 -> username: retailer2   password: retailer123
  Driver 1   -> username: driver1     password: driver123
  Driver 2   -> username: driver2     password: driver123
"""
from datetime import date

from dotenv import load_dotenv

load_dotenv()

from app import create_app, db  # noqa: E402
from app.models.user import User
from app.models.retailer import Retailer
from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.models.area import Area
from app.models.route import Route
from app.models.chicken_rate import ChickenRate
from app.models.fare_rate import FareRate

app = create_app()

with app.app_context():
    db.create_all()

    if not User.query.filter_by(username="admin").first():
        admin = User(username="admin", role="admin")
        admin.set_password("admin123")
        db.session.add(admin)

    area_names = ["Panaji", "Old Goa", "Mapusa", "Margao", "Vasco"]
    for name in area_names:
        if not Area.query.filter_by(name=name).first():
            db.session.add(Area(name=name, region="Goa"))
    db.session.flush()

    # Group the areas into a practical route: Chandgad -> Panaji -> Old Goa -> Mapusa
    # (Margao/Vasco left unrouted on purpose, to demonstrate the "unrouted" path)
    route = Route.query.filter_by(name="Chandgad - North Goa").first()
    if not route:
        route = Route(name="Chandgad - North Goa", source="Chandgad", region="Goa")
        db.session.add(route)
        db.session.flush()
        for i, name in enumerate(["Panaji", "Old Goa", "Mapusa"]):
            area = Area.query.filter_by(name=name).first()
            area.route_id = route.id
            area.route_sequence = i + 1

    panaji = Area.query.filter_by(name="Panaji").first()

    if not User.query.filter_by(username="retailer1").first():
        r_user = User(username="retailer1", role="retailer")
        r_user.set_password("retailer123")
        db.session.add(r_user)
        db.session.flush()
        db.session.add(
            Retailer(
                user_id=r_user.id,
                retailer_code="RET-0001",
                shop_name="Sagar Chicken Center",
                owner_name="Ramesh Naik",
                mobile_number="9876543210",
                area_id=panaji.id if panaji else None,
                status="active",
            )
        )

    if not User.query.filter_by(username="retailer2").first():
        r2_user = User(username="retailer2", role="retailer")
        r2_user.set_password("retailer123")
        db.session.add(r2_user)
        db.session.flush()
        db.session.add(
            Retailer(
                user_id=r2_user.id,
                retailer_code="RET-0002",
                shop_name="Goa Fresh Meats",
                owner_name="Suresh Kamat",
                mobile_number="9876543211",
                area_id=panaji.id if panaji else None,
                status="active",
            )
        )

    if not Vehicle.query.filter_by(vehicle_number="GA-01-AB-1234").first():
        db.session.add(Vehicle(vehicle_number="GA-01-AB-1234", capacity_kg=2000))
    if not Vehicle.query.filter_by(vehicle_number="GA-02-CD-5678").first():
        db.session.add(Vehicle(vehicle_number="GA-02-CD-5678", capacity_kg=1500))
    if not Vehicle.query.filter_by(vehicle_number="GA-09-EF-9999").first():
        db.session.add(Vehicle(vehicle_number="GA-09-EF-9999", capacity_kg=2200, is_backup=True))

    if not User.query.filter_by(username="driver1").first():
        d_user = User(username="driver1", role="driver")
        d_user.set_password("driver123")
        db.session.add(d_user)
        db.session.flush()
        db.session.add(
            Driver(
                user_id=d_user.id,
                driver_code="DRV-0001",
                full_name="Vaibhav Patil",
                mobile_number="9876500001",
                licence_number="MH12-2020-0001234",
                status="available",
                rotation_position=1,
            )
        )

    if not User.query.filter_by(username="driver2").first():
        d2_user = User(username="driver2", role="driver")
        d2_user.set_password("driver123")
        db.session.add(d2_user)
        db.session.flush()
        db.session.add(
            Driver(
                user_id=d2_user.id,
                driver_code="DRV-0002",
                full_name="Sandip Gaikwad",
                mobile_number="9876500002",
                licence_number="MH12-2021-0005678",
                status="available",
                rotation_position=2,
            )
        )

    if not ChickenRate.query.filter_by(rate_date=date.today()).first():
        db.session.add(ChickenRate(rate_date=date.today(), rate_per_kg=145.0))

    if not FareRate.query.filter_by(rate_date=date.today()).first():
        db.session.add(
            FareRate(rate_date=date.today(), rate_per_kg_loss=20.0, driver_fare_rate_per_kg=10.0)
        )

    db.session.commit()
    print("Seed complete.")
    print("  admin      / admin123")
    print("  retailer1  / retailer123")
    print("  retailer2  / retailer123")
    print("  driver1    / driver123")
    print("  driver2    / driver123")
