"use client";

import type { Meeting } from "@/lib/types";
import MeetingCard from "./MeetingCard";

interface Props {
  title: string;
  meetings: Meeting[];
  emptyText: string;
}

export default function MeetingList({ title, meetings, emptyText }: Props) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>
      {meetings.length === 0 ? (
        <div className="card p-6 text-center text-sm text-gray-500">{emptyText}</div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => (
            <MeetingCard key={m.id} meeting={m} />
          ))}
        </div>
      )}
    </section>
  );
}
