"use client";

/**
 * /join?id=XXX-XXX-XXXX — landing route hit from shareable invite links.
 * Prompts for display name (prefilled if signed in), validates the meeting
 * exists, then forwards into the meeting room.
 */
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function JoinInner() {
  const router = useRouter();
  const params = useSearchParams();
  const meetingId = params.get("id") || "";
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [checking, setChecking] = useState(true);
  const [validMeetingTitle, setValidMeetingTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!meetingId) {
      setError("Missing meeting ID in the invite link.");
      setChecking(false);
      return;
    }
    api
      .getMeeting(meetingId)
      .then((m) => setValidMeetingTitle(m.title))
      .catch((e) => setError(e.message || "Meeting not found"))
      .finally(() => setChecking(false));
  }, [meetingId]);

  // Prefill from logged-in user.
  useEffect(() => {
    if (user && !displayName) setDisplayName(user.name);
  }, [user, displayName]);

  function handleJoin() {
    if (!displayName.trim()) {
      setError("Please enter a display name");
      return;
    }
    setSubmitting(true);
    router.push(
      `/meeting/${encodeURIComponent(meetingId)}?name=${encodeURIComponent(displayName.trim())}`
    );
  }

  return (
    <div className="max-w-md mx-auto card p-6 space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Join meeting</h1>
      {checking ? (
        <p className="text-sm text-gray-500">Checking meeting…</p>
      ) : error && !validMeetingTitle ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <>
          <div className="text-sm text-gray-600">
            <div>Meeting</div>
            <div className="font-semibold text-gray-800">{validMeetingTitle}</div>
            <div className="font-mono text-xs mt-1">{meetingId}</div>
          </div>
          <label className="block">
            <span className="text-sm text-gray-600">Your display name</span>
            <input
              className="input mt-1"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jane Doe"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" onClick={handleJoin} disabled={submitting}>
            {submitting ? "Joining…" : "Join meeting"}
          </button>
        </>
      )}
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="card p-6 text-gray-500">Loading…</div>}>
      <JoinInner />
    </Suspense>
  );
}
