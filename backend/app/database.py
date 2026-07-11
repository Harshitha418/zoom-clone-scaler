"""SQLAlchemy engine + session factory.

We keep this tiny and centralized so routers/services just call `get_db`.
"""
import os
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker


def _default_database_url() -> str:
    """Prefer a writable temp DB in hosted environments such as Railway."""
    if os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_PROJECT_ID"):
        return "sqlite:////tmp/zoom_clone.db"
    return "sqlite:///./zoom_clone.db"


DATABASE_URL = os.getenv("DATABASE_URL", _default_database_url())


def _resolve_sqlite_database_path(database_url: str):
    """Return a writable SQLite file path, falling back to /tmp when needed."""
    if not database_url.startswith("sqlite"):
        return None

    url = make_url(database_url)
    database = url.database
    if not database or database in {"", ":memory:"}:
        return None

    database_path = Path(database)
    if not database_path.is_absolute():
        database_path = Path(os.path.abspath(database))

    return database_path


def create_engine_for_database_url(database_url: str):
    """Create a SQLAlchemy engine and ensure SQLite parent directories exist."""
    if database_url.startswith("sqlite"):
        database_path = _resolve_sqlite_database_path(database_url)
        if database_path is not None:
            try:
                database_path.parent.mkdir(parents=True, exist_ok=True)
                if not database_path.exists():
                    database_path.touch(exist_ok=True)
            except OSError:
                fallback_path = Path("/tmp") / "zoom_clone.db"
                fallback_path.parent.mkdir(parents=True, exist_ok=True)
                database_url = f"sqlite:///{fallback_path}"

    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False} if database_url.startswith("sqlite") else {},
    )

    if database_url.startswith("sqlite"):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return engine
        except Exception:
            fallback_path = Path("/tmp") / "zoom_clone.db"
            fallback_path.parent.mkdir(parents=True, exist_ok=True)
            fallback_url = f"sqlite:///{fallback_path}"
            fallback_engine = create_engine(
                fallback_url,
                connect_args={"check_same_thread": False},
            )
            return fallback_engine

    return engine


# `check_same_thread` is required for SQLite when used with FastAPI's threadpool.
engine = create_engine_for_database_url(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def add_column_if_missing(table: str, column: str, ddl_type: str, default_sql: str = "") -> None:
    """Best-effort ADD COLUMN for dev DBs that predate a new field.

    In production we'd use Alembic; this keeps the demo one-command friendly
    when the schema gains columns (e.g. `password_hash`, `is_muted`) between runs.
    """
    inspector = inspect(engine)
    if table not in inspector.get_table_names():
        return
    existing = {c["name"] for c in inspector.get_columns(table)}
    if column in existing:
        return
    default_clause = f" DEFAULT {default_sql}" if default_sql else ""
    with engine.begin() as conn:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}{default_clause}"))


def run_light_migrations() -> None:
    """Idempotent ADD COLUMN migrations for the tiny schema evolutions in this app."""
    add_column_if_missing("users", "password_hash", "VARCHAR(255)")
    add_column_if_missing("participants", "is_muted", "BOOLEAN", default_sql="0")
