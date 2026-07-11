"use client";

import { useState } from "react";
import Modal from "./Modal";
import { api } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function ScheduleMeetingModal({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [datetime, setDatetime] = useState(""); // yyyy-MM-ddTHH:mm
  const [duration, setDuration] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ id: string; link: string } | null>(null);

  function reset() {
    setTitle("");
    setDescription("");
    setDatetime("");
    setDuration(30);
    setError(null);
    setCreated(null);
  }

  async function handleSchedule() {
    setError(null);
    if (!title.trim()) return setError("Title is required");
    if (!datetime) return setError("Please pick a date & time");
    setLoading(true);
    try {
      const m = await api.createScheduled({
        title: title.trim(),
        description: description.trim() || undefined,
        // datetime-local is naive; convert to ISO for backend.
        scheduled_time: new Date(datetime).toISOString(),
        duration: Number(duration),
      });
      setCreated({ id: m.meeting_id, link: m.invite_link });
      onCreated();
    } catch (e: any) {
      setError(e.message || "Failed to schedule");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Schedule a meeting"
    >
      {created ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">Meeting scheduled successfully.</p>
          <div className="card p-3 text-sm">
            <div className="text-gray-500">Meeting ID</div>
            <div className="font-mono">{created.id}</div>
            <div className="text-gray-500 mt-2">Invite link</div>
            <div className="break-all text-zoom">{created.link}</div>
          </div>
          <div className="flex justify-end">
            <button
              className="btn-primary"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm text-gray-600">Title</span>
            <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Description (optional)</span>
            <textarea
              className="input mt-1"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-gray-600">Date & time</span>
              <input
                type="datetime-local"
                className="input mt-1"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Duration (min)</span>
              <input
                type="number"
                min={5}
                max={600}
                className="input mt-1"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSchedule} disabled={loading}>
              {loading ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
