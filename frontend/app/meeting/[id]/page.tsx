"use client";

/**
 * Mocked in-meeting room. No real WebRTC — participants are rendered as tiles
 * and self mute/video controls only change local visual state. Host controls
 * (mute participant, mute all, remove) are wired to the backend so they take
 * effect for everyone who refetches.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ParticipantTile from "@/components/ParticipantTile";
import ControlBar from "@/components/ControlBar";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Meeting, Participant } from "@/lib/types";

const POLL_MS = 4000;

export default function MeetingRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = params.id;
  const providedName = searchParams.get("name") || "";
  const { user } = useAuth();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [selfParticipantId, setSelfParticipantId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [muteAllBusy, setMuteAllBusy] = useState(false);
  const registeredRef = useRef(false);

  const selfName = providedName || user?.name || "You";
  const isHost = !!(user && meeting && meeting.host.id === user.id);

  const refreshMeeting = useCallback(async () => {
    try {
      const m = await api.getMeeting(meetingId);
      setMeeting(m);
    } catch (e: any) {
      setError(e.message || "Meeting not found");
    }
  }, [meetingId]);

  // Initial load
  useEffect(() => {
    refreshMeeting();
  }, [refreshMeeting]);

  // Register self as a participant once, remembering our participant id so we
  // can detect a host-initiated removal and detect a host-initiated mute.
  useEffect(() => {
    if (!meeting || registeredRef.current) return;
    registeredRef.current = true;
    api
      .join(meeting.meeting_id, selfName)
      .then((p) => {
        setSelfParticipantId(p.id);
        refreshMeeting();
      })
      .catch(() => {
        /* fail silent — mock room */
      });
  }, [meeting, selfName, refreshMeeting]);

  // Poll for participant changes so host actions propagate.
  useEffect(() => {
    if (!meeting) return;
    const t = setInterval(refreshMeeting, POLL_MS);
    return () => clearInterval(t);
  }, [meeting, refreshMeeting]);

  // Server-side mute pushed by host applies to self automatically.
  const selfServerMuted = useMemo(() => {
    if (!meeting || selfParticipantId == null) return false;
    const p = meeting.participants.find((x) => x.id === selfParticipantId);
    return p?.is_muted ?? false;
  }, [meeting, selfParticipantId]);

  useEffect(() => {
    if (selfServerMuted && !muted) setMuted(true);
  }, [selfServerMuted, muted]);

  // If we were removed by the host, bounce home.
  useEffect(() => {
    if (!meeting || selfParticipantId == null) return;
    const stillIn = meeting.participants.some((p) => p.id === selfParticipantId);
    if (!stillIn && registeredRef.current) {
      alert("You were removed from the meeting by the host.");
      router.push("/");
    }
  }, [meeting, selfParticipantId, router]);

  function handleCopy() {
    if (!meeting) return;
    navigator.clipboard.writeText(meeting.invite_link);
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 1500);
  }

  function handleLeave() {
    router.push("/");
  }

  async function handleToggleParticipantMute(p: Participant) {
    if (!meeting) return;
    setBusyId(p.id);
    try {
      await api.muteParticipant(meeting.meeting_id, p.id, !p.is_muted);
      await refreshMeeting();
    } catch (e: any) {
      alert(e.message || "Failed to update participant");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(p: Participant) {
    if (!meeting) return;
    if (!confirm(`Remove ${p.display_name} from the meeting?`)) return;
    setBusyId(p.id);
    try {
      await api.removeParticipant(meeting.meeting_id, p.id);
      await refreshMeeting();
    } catch (e: any) {
      alert(e.message || "Failed to remove participant");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMuteAll() {
    if (!meeting) return;
    setMuteAllBusy(true);
    try {
      await api.muteAll(meeting.meeting_id);
      await refreshMeeting();
    } catch (e: any) {
      alert(e.message || "Failed to mute all");
    } finally {
      setMuteAllBusy(false);
    }
  }

  if (error) {
    return (
      <div className="card p-6 text-red-600">
        {error} —{" "}
        <button className="underline" onClick={() => router.push("/")}>
          back to dashboard
        </button>
      </div>
    );
  }

  if (!meeting) {
    return <div className="card p-6 text-gray-500">Loading meeting…</div>;
  }

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
      <header className="bg-gray-800 text-white px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{meeting.title}</div>
          <div className="text-xs text-gray-400 font-mono truncate">{meeting.meeting_id}</div>
        </div>
        <div className="text-xs sm:text-sm text-gray-300 shrink-0">
          {meeting.participants.length} in meeting
          {isHost && (
            <span className="ml-2 hidden sm:inline bg-amber-500 text-white text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">
              You&apos;re host
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {meeting.participants.map((p) => {
            const isSelf = p.id === selfParticipantId;
            const isTileHost = p.display_name === meeting.host.name; // best-effort visual tag
            return (
              <ParticipantTile
                key={p.id}
                name={p.display_name}
                muted={isSelf ? muted : false}
                videoOff={isSelf ? videoOff : true}
                isSelf={isSelf}
                isHost={isTileHost}
                serverMuted={p.is_muted}
                showHostControls={isHost && !isSelf}
                onToggleMute={
                  isHost && !isSelf ? () => handleToggleParticipantMute(p) : undefined
                }
                onRemove={isHost && !isSelf ? () => handleRemove(p) : undefined}
                actionBusy={busyId === p.id}
              />
            );
          })}
        </div>
      </div>

      <ControlBar
        muted={muted}
        videoOff={videoOff}
        onToggleMute={() => setMuted((m) => !m)}
        onToggleVideo={() => setVideoOff((v) => !v)}
        onCopyLink={handleCopy}
        onLeave={handleLeave}
        copyState={copyState}
        isHost={isHost}
        onMuteAll={isHost ? handleMuteAll : undefined}
        muteAllBusy={muteAllBusy}
      />
    </div>
  );
}
