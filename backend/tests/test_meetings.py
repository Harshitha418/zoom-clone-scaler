from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Meeting, Participant, User
from app.routers.meetings import join_meeting
from app.schemas import JoinMeetingIn


def test_join_meeting_reuses_existing_participant_for_same_display_name():
    engine = create_engine("sqlite:///:memory:")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    try:
        host = User(name="Host", email="host@example.com", password_hash="hash")
        db.add(host)
        db.commit()
        db.refresh(host)

        meeting = Meeting(
            meeting_id="abc123",
            title="Test Meeting",
            description="Demo",
            scheduled_time=datetime.utcnow() + timedelta(hours=1),
            duration=30,
            invite_link="https://example.com/abc123",
            status="scheduled",
            host_id=host.id,
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)

        first = join_meeting("abc123", JoinMeetingIn(display_name="Alice"), db=db)
        second = join_meeting("abc123", JoinMeetingIn(display_name="Alice"), db=db)

        assert first.id == second.id
        assert db.query(Participant).filter(Participant.meeting_id == meeting.id).count() == 1
    finally:
        db.close()
