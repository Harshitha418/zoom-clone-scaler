"""Business logic for meetings: ID + invite link generation.

Kept in a service module so routers stay thin and this is easy to unit-test.

Meeting ID generation
---------------------
Zoom-style IDs look like "123-456-7890" (three groups: 3-3-4 digits).
We generate a random 10-digit number and format it. On the extremely rare
chance of a collision we retry — cap at 5 attempts to avoid an infinite loop
if the table is somehow full (won't happen at this scale, but defensive).
"""
import secrets
from datetime import datetime
from sqlalchemy.orm import Session

from ..models import Meeting

MAX_ID_ATTEMPTS = 5


def _format_id(digits: str) -> str:
    return f"{digits[0:3]}-{digits[3:6]}-{digits[6:10]}"


def generate_unique_meeting_id(db: Session) -> str:
    """Return a unique meeting ID formatted as XXX-XXX-XXXX."""
    for _ in range(MAX_ID_ATTEMPTS):
        # secrets.randbelow gives a cryptographically-strong 10-digit number.
        digits = f"{secrets.randbelow(10**10):010d}"
        candidate = _format_id(digits)
        exists = db.query(Meeting).filter(Meeting.meeting_id == candidate).first()
        if not exists:
            return candidate
    raise RuntimeError("Could not generate a unique meeting ID")


def build_invite_link(meeting_id: str, frontend_base: str) -> str:
    """Return the shareable link a user clicks to join."""
    return f"{frontend_base.rstrip('/')}/join?id={meeting_id}"


def create_instant_meeting(
    db: Session, host_id: int, title: str, frontend_base: str
) -> Meeting:
    meeting_id = generate_unique_meeting_id(db)
    meeting = Meeting(
        meeting_id=meeting_id,
        title=title or "Instant Meeting",
        description=None,
        scheduled_time=datetime.utcnow(),
        duration=60,
        invite_link=build_invite_link(meeting_id, frontend_base),
        status="instant",
        host_id=host_id,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


def create_scheduled_meeting(
    db: Session,
    host_id: int,
    title: str,
    description: str | None,
    scheduled_time: datetime,
    duration: int,
    frontend_base: str,
) -> Meeting:
    meeting_id = generate_unique_meeting_id(db)
    meeting = Meeting(
        meeting_id=meeting_id,
        title=title,
        description=description,
        scheduled_time=scheduled_time,
        duration=duration,
        invite_link=build_invite_link(meeting_id, frontend_base),
        status="scheduled",
        host_id=host_id,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting
