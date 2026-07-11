"""SQLAlchemy ORM models.

Schema overview (also documented in the root README):

- User: the person who creates meetings. For this assignment there is a single
  seeded user "You"; auth is intentionally out of scope.

- Meeting: the core entity. Each meeting has a human-friendly `meeting_id`
  (e.g. "123-456-7890") that is unique and used in invite links, plus a
  `status` of either "instant" (created via "New Meeting") or "scheduled".

- Participant: a lightweight join row per (meeting, display_name). This lets us
  extend the app later (e.g. show attendee counts) without changing routes.

Relationships:
    User 1 ─── * Meeting     (host_id FK)
    Meeting 1 ─── * Participant
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(200), unique=True, nullable=False)
    # Bcrypt hash. Nullable so pre-auth seed rows (if any) don't break; new
    # users created through signup always populate this.
    password_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    meetings = relationship("Meeting", back_populates="host", cascade="all, delete-orphan")


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    # Human-facing ID shown in the UI and used in invite links.
    meeting_id = Column(String(20), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    scheduled_time = Column(DateTime, nullable=False)
    duration = Column(Integer, nullable=False, default=30)  # minutes
    invite_link = Column(String(500), nullable=False)
    # "instant" for New Meeting, "scheduled" for the schedule flow.
    status = Column(String(20), nullable=False, default="scheduled")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    host_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    host = relationship("User", back_populates="meetings")

    participants = relationship(
        "Participant", back_populates="meeting", cascade="all, delete-orphan"
    )


class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    display_name = Column(String(100), nullable=False)
    # Host controls: whether this participant has been server-muted by the host.
    is_muted = Column(Boolean, nullable=False, default=False)
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    meeting = relationship("Meeting", back_populates="participants")
