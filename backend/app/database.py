"""SQLAlchemy engine + session factory.

We keep this tiny and centralized so routers/services just call `get_db`.
"""
import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./zoom_clone.db")

# `check_same_thread` is required for SQLite when used with FastAPI's threadpool.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

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
