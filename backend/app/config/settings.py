import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


class BaseConfig:
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-in-.env")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "change-me-too-in-.env")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # SQLite for development. Swap SQLALCHEMY_DATABASE_URI to a Postgres URL
    # (e.g. postgresql://user:pass@host:5432/kwality) for production —
    # no other code changes required since we only use the SQLAlchemy ORM layer.
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'kwality.db')}"
    )


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class ProductionConfig(BaseConfig):
    DEBUG = False


class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


CONFIG_MAP = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}


def get_config(name=None):
    name = name or os.environ.get("FLASK_ENV", "development")
    return CONFIG_MAP.get(name, DevelopmentConfig)
