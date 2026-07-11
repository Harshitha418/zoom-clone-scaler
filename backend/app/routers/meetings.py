"""Meeting routes: list, create instant, create scheduled, fetch, join, host controls."""
import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Meeting, User, Participant
from ..schemas import (
    MeetingOut,
    MeetingCreateInstant,
    MeetingCreateScheduled,
    JoinMeetingIn,
    ParticipantOut,
    MutePatchIn,
)
from ..services import meeting_service

router = APIRouter(prefix="/meetings", tags=["meetings"])


def _frontend_base() -> str:
    return os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")


def _get_meeting_or_404(db: Session, meeting_id: str) -> Meeting:
    meeting = db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


def _require_host(meeting: Meeting, user: User) -> None:
    if meeting.host_id != user.id:
        raise HTTPException(status_code=403, detail="Only the host can perform this action")


# ---------- List / filter ----------
@router.get("", response_model=List[MeetingOut])
def list_meetings(
    kind: Optional[str] = Query(default=None, description="'upcoming' or 'recent'"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return meetings hosted by the current user, optionally split by upcoming/recent."""
    now = datetime.utcnow()
    q = db.query(Meeting).filter(Meeting.host_id == user.id)
    if kind == "upcoming":
        q = q.filter(Meeting.scheduled_time >= now).order_by(Meeting.scheduled_time.asc())
    elif kind == "recent":
        q = q.filter(Meeting.scheduled_time < now).order_by(Meeting.scheduled_time.desc())
    else:
        q = q.order_by(Meeting.scheduled_time.desc())
    return q.all()


# ---------- Create ----------
@router.post("/instant", response_model=MeetingOut, status_code=201)
def create_instant(
    payload: MeetingCreateInstant,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return meeting_service.create_instant_meeting(
        db,
        host_id=user.id,
        title=payload.title or "Instant Meeting",
        frontend_base=_frontend_base(),
    )


@router.post("/schedule", response_model=MeetingOut, status_code=201)
def create_scheduled(
    payload: MeetingCreateScheduled,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return meeting_service.create_scheduled_meeting(
        db,
        host_id=user.id,
        title=payload.title,
        description=payload.description,
        scheduled_time=payload.scheduled_time,
        duration=payload.duration,
        frontend_base=_frontend_base(),
    )


# ---------- Fetch one (public: needed for invite-link landing) ----------
@router.get("/{meeting_id}", response_model=MeetingOut)
def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    return _get_meeting_or_404(db, meeting_id)


# ---------- Join (public: guests with a link can join without an account) ----------
@router.post("/{meeting_id}/join", response_model=ParticipantOut, status_code=201)
def join_meeting(meeting_id: str, payload: JoinMeetingIn, db: Session = Depends(get_db)):
    meeting = _get_meeting_or_404(db, meeting_id)

    participant = (
        db.query(Participant)
        .filter(
            Participant.meeting_id == meeting.id,
            Participant.display_name == payload.display_name.strip(),
        )
        .first()
    )
    if participant is None:
        participant = Participant(
            display_name=payload.display_name.strip(),
            meeting_id=meeting.id,
        )
        db.add(participant)
        db.commit()
        db.refresh(participant)

    return participant


# ---------- Host controls ----------
@router.patch(
    "/{meeting_id}/participants/{participant_id}/mute",
    response_model=ParticipantOut,
)
def set_participant_mute(
    meeting_id: str,
    participant_id: int,
    payload: MutePatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Host toggles the server-mute state of a single participant."""
    meeting = _get_meeting_or_404(db, meeting_id)
    _require_host(meeting, user)
    participant = (
        db.query(Participant)
        .filter(Participant.id == participant_id, Participant.meeting_id == meeting.id)
        .first()
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found in this meeting")
    participant.is_muted = bool(payload.muted)
    db.commit()
    db.refresh(participant)
    return participant


@router.post("/{meeting_id}/mute-all", response_model=List[ParticipantOut])
def mute_all(
    meeting_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Host mutes every participant currently in the meeting."""
    meeting = _get_meeting_or_404(db, meeting_id)
    _require_host(meeting, user)
    updated: List[Participant] = []
    for p in meeting.participants:
        p.is_muted = True
        updated.append(p)
    db.commit()
    for p in updated:
        db.refresh(p)
    return updated


@router.delete("/{meeting_id}/participants/{participant_id}", status_code=204)
def remove_participant(
    meeting_id: str,
    participant_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Host removes a participant from the meeting."""
    meeting = _get_meeting_or_404(db, meeting_id)
    _require_host(meeting, user)
    participant = (
        db.query(Participant)
        .filter(Participant.id == participant_id, Participant.meeting_id == meeting.id)
        .first()
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found in this meeting")
    db.delete(participant)
    db.commit()
    return None
