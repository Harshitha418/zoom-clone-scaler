"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Extract the meeting ID from either:
 *  - a raw ID "123-456-7890"
 *  - an invite URL "http://.../join?id=123-456-7890"
 * Falls back to null if we can't find a plausible ID.
 */
function extractMeetingId(input: string): string | null {
  const trimmed = input.trim();
  // Try URL
  try {
    const url = new URL(trimmed);
    const id = url.searchParams.get("id");
    if (id) return id;
  } catch {
    /* not a URL */
  }
  // Otherwise treat as raw ID — normalize by removing spaces
  const cleaned = trimmed.replace(/\s+/g, "");
  return cleaned || null;
}

export default function JoinMeetingModal({ open, onClose }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [meetingInput, setMeetingInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Pre-fill display name from the logged-in user.
  useEffect(() => {
    if (open && user && !displayName) setDisplayName(user.name);
  }, [open, user, displayName]);

  async function handleJoin() {
    setError(null);
    const id = extractMeetingId(meetingInput);
    if (!id) return setError("Please enter a meeting ID or invite link");
    if (!displayName.trim()) return setError("Please enter your display name");
    setLoading(true);
    try {
      // Validate the meeting exists before navigating
      await api.getMeeting(id);
      // Pass name via query so the room can auto-register the participant
      router.push(
        `/meeting/${encodeURIComponent(id)}?name=${encodeURIComponent(displayName.trim())}`
      );
    } catch (e: any) {
      setError(e.message || "Meeting not found");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Join a meeting">
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm text-gray-600">Meeting ID or invite link</span>
          <input
            className="input mt-1"
            value={meetingInput}
            onChange={(e) => setMeetingInput(e.target.value)}
            placeholder="123-456-7890"
          />
        </label>
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
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleJoin} disabled={loading}>
            {loading ? "Joining…" : "Join"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
