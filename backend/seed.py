"""Seed the database with the default user and sample meetings.

Run: `python seed.py` from the backend/ directory.
Idempotent — safe to run multiple times.
"""
import os
from datetime import datetime, timedelta

from dotenv import load_dotenv

load_dotenv()

from app.database import Base, engine, SessionLocal, run_light_migrations  # noqa: E402
from app.models import User, Meeting  # noqa: E402
from app.services.auth_service import hash_password  # noqa: E402
from app.services.meeting_service import (  # noqa: E402
    generate_unique_meeting_id,
    build_invite_link,
)

FRONTEND_BASE = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
DEFAULT_EMAIL = "you@example.com"
DEFAULT_PASSWORD = "password123"


def seed():
    Base.metadata.create_all(bind=engine)
    run_light_migrations()
    db = SessionLocal()
    try:
        # --- Default user ---
        user = db.query(User).filter(User.email == DEFAULT_EMAIL).first()
        if not user:
            user = User(
                name="You",
                email=DEFAULT_EMAIL,
                password_hash=hash_password(DEFAULT_PASSWORD),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Seeded user: {user.name}  (login: {DEFAULT_EMAIL} / {DEFAULT_PASSWORD})")
        elif not user.password_hash:
            # Existing seed row from v1.0 predates auth — attach a password so login works.
            user.password_hash = hash_password(DEFAULT_PASSWORD)
            db.commit()
            print(f"Backfilled password for existing user (login: {DEFAULT_EMAIL} / {DEFAULT_PASSWORD})")

        if db.query(Meeting).count() > 0:
            print("Meetings already present — skipping meeting seed.")
            return

        now = datetime.utcnow()
        samples = [
            # Upcoming
            dict(
                title="Team Standup",
                description="Daily sync with the engineering team",
                scheduled_time=now + timedelta(hours=2),
                duration=30,
                status="scheduled",
            ),
            dict(
                title="Product Review",
                description="Q3 roadmap discussion",
                scheduled_time=now + timedelta(days=1, hours=3),
                duration=60,
                status="scheduled",
            ),
            # Recent (past)
            dict(
                title="Design Sync",
                description="Reviewed the new landing page mocks",
                scheduled_time=now - timedelta(days=1),
                duration=45,
                status="scheduled",
            ),
            dict(
                title="1:1 with Manager",
                description="Weekly check-in",
                scheduled_time=now - timedelta(days=3, hours=2),
                duration=30,
                status="scheduled",
            ),
        ]

        for s in samples:
            mid = generate_unique_meeting_id(db)
            m = Meeting(
                meeting_id=mid,
                title=s["title"],
                description=s["description"],
                scheduled_time=s["scheduled_time"],
                duration=s["duration"],
                invite_link=build_invite_link(mid, FRONTEND_BASE),
                status=s["status"],
                host_id=user.id,
            )
            db.add(m)
        db.commit()
        print(f"Seeded {len(samples)} sample meetings.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
