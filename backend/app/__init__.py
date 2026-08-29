from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

from app.config.settings import get_config

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()


def create_app(config_name=None):
    app = Flask(__name__)
    app.config.from_object(get_config(config_name))

    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    CORS(app, supports_credentials=True)

    # Import models so they are registered with SQLAlchemy before create_all/migrations
    from app.models import (  # noqa: F401
        user,
        retailer,
        driver,
        vehicle,
        area,
        chicken_rate,
        order,
        route,
        trip,
        fare_rate,
        weight_record,
        driver_fare,
        emergency_case,
        backup_assignment,
        notification,
        payment,
        invoice,
    )

    # Register blueprints
    from app.routes.auth_routes import auth_bp
    from app.routes.admin_routes import admin_bp
    from app.routes.retailer_routes import retailer_bp
    from app.routes.driver_routes import driver_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(retailer_bp, url_prefix="/api/retailers")
    app.register_blueprint(driver_bp, url_prefix="/api/drivers")

    @app.get("/api/health")
    def health():
        return {"status": "ok", "service": "kwality-direct-backend"}

    @app.errorhandler(404)
    def not_found(e):
        return {"error": "Not found"}, 404

    @app.errorhandler(500)
    def server_error(e):
        return {"error": "Internal server error"}, 500

    return app
