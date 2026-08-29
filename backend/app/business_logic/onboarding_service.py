from app import db
from app.models.user import User
from app.models.retailer import Retailer
from app.models.driver import Driver


class OnboardingError(Exception):
    pass


def _next_code(model, column, prefix):
    count = model.query.count()
    return f"{prefix}-{count + 1:04d}"


def create_retailer(username, password, shop_name, owner_name, mobile_number, area_id=None):
    if User.query.filter_by(username=username).first():
        raise OnboardingError("Username already taken")

    user = User(username=username, role="retailer")
    user.set_password(password)
    db.session.add(user)
    db.session.flush()  # get user.id without committing yet

    retailer = Retailer(
        user_id=user.id,
        retailer_code=_next_code(Retailer, "retailer_code", "RET"),
        shop_name=shop_name,
        owner_name=owner_name,
        mobile_number=mobile_number,
        area_id=area_id,
        status="active",
    )
    db.session.add(retailer)
    db.session.commit()
    return retailer


def create_driver(username, password, full_name, mobile_number, licence_number=None):
    if User.query.filter_by(username=username).first():
        raise OnboardingError("Username already taken")

    user = User(username=username, role="driver")
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    driver = Driver(
        user_id=user.id,
        driver_code=_next_code(Driver, "driver_code", "DRV"),
        full_name=full_name,
        mobile_number=mobile_number,
        licence_number=licence_number,
        status="available",
    )
    db.session.add(driver)
    db.session.commit()
    return driver
