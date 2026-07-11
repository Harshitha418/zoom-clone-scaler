"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import { api } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewMeetingModal({ open, onClose, onCreated }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const meeting = await api.createInstant(title || undefined);
      onCreated();
      router.push(`/meeting/${meeting.meeting_id}`);
    } catch (e: any) {
      setError(e.message || "Failed to create meeting");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Start a new meeting">
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm text-gray-600">Meeting title (optional)</span>
          <input
            className="input mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Instant Meeting"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleCreate} disabled={loading}>
            {loading ? "Starting…" : "Start Meeting"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
