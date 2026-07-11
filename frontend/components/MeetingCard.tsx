"use client";

import Link from "next/link";
import type { Meeting } from "@/lib/types";

interface Props {
  meeting: Meeting;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MeetingCard({ meeting }: Props) {
  return (
    <div className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-gray-800 truncate">{meeting.title}</h3>
          <span
            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
              meeting.status === "instant"
                ? "bg-green-100 text-green-700"
                : "bg-zoom-light text-zoom"
            }`}
          >
            {meeting.status}
          </span>
        </div>
        {meeting.description && (
          <p className="text-sm text-gray-500 truncate">{meeting.description}</p>
        )}
        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
          <span>{formatDateTime(meeting.scheduled_time)}</span>
          <span className="hidden sm:inline">·</span>
          <span>{meeting.duration} min</span>
          <span className="hidden sm:inline">·</span>
          <span className="font-mono">{meeting.meeting_id}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 sm:justify-end">
        <Link
          href={`/meeting/${meeting.meeting_id}`}
          className="btn-primary text-sm w-full sm:w-auto"
        >
          Join
        </Link>
      </div>
    </div>
  );
}
