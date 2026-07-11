"""Pydantic schemas for request validation and response serialization."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------- User ----------
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


# ---------- Auth ----------
class SignupIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class AuthOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Participant ----------
class ParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    is_muted: bool = False
    joined_at: datetime


class JoinMeetingIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)


class MutePatchIn(BaseModel):
    muted: bool


# ---------- Meeting ----------
class MeetingCreateInstant(BaseModel):
    """Payload for the 'New Meeting' button. Title is optional."""
    title: Optional[str] = "Instant Meeting"


class MeetingCreateScheduled(BaseModel):
    """Payload for the schedule form."""
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    scheduled_time: datetime
    duration: int = Field(ge=5, le=600, default=30)  # minutes


class MeetingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: str
    title: str
    description: Optional[str] = None
    scheduled_time: datetime
    duration: int
    invite_link: str
    status: str
    created_at: datetime
    host: UserOut
    participants: List[ParticipantOut] = []
