"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ActionButtons from "@/components/ActionButtons";
import SearchBar from "@/components/SearchBar";
import MeetingList from "@/components/MeetingList";
import NewMeetingModal from "@/components/NewMeetingModal";
import JoinMeetingModal from "@/components/JoinMeetingModal";
import ScheduleMeetingModal from "@/components/ScheduleMeetingModal";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Meeting } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [recent, setRecent] = useState<Meeting[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Redirect to /login if unauthenticated once the auth check finishes.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [u, r] = await Promise.all([
        api.listMeetings("upcoming"),
        api.listMeetings("recent"),
      ]);
      setUpcoming(u);
      setRecent(r);
    } catch (e: any) {
      setError(e.message || "Failed to load meetings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) refresh();
  }, [user]);

  // Real-time filter over both lists by title OR date (YYYY-MM-DD or human-readable)
  const filter = (list: Meeting[]) => {
    if (!query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter((m) => {
      const d = new Date(m.scheduled_time);
      const iso = d.toISOString().slice(0, 10); // yyyy-mm-dd
      const human = d.toLocaleDateString().toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        iso.includes(q) ||
        human.includes(q)
      );
    });
  };

  const filteredUpcoming = useMemo(() => filter(upcoming), [upcoming, query]);
  const filteredRecent = useMemo(() => filter(recent), [recent, query]);

  if (authLoading || !user) {
    return <div className="card p-6 text-center text-gray-500">Loading…</div>;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
          Welcome back, {user.name}
        </h1>
        <p className="text-sm sm:text-base text-gray-500">Start, join, or schedule a meeting.</p>
      </div>

      <ActionButtons
        onNew={() => setNewOpen(true)}
        onJoin={() => setJoinOpen(true)}
        onSchedule={() => setScheduleOpen(true)}
      />

      <SearchBar value={query} onChange={setQuery} />

      {error && (
        <div className="card p-4 text-sm text-red-600">
          {error}. Make sure the backend is running at NEXT_PUBLIC_API_URL.
        </div>
      )}

      {loading ? (
        <div className="card p-6 text-center text-gray-500">Loading meetings…</div>
      ) : (
        <div className="grid gap-6 md:gap-8 md:grid-cols-2">
          <MeetingList
            title="Upcoming meetings"
            meetings={filteredUpcoming}
            emptyText={query ? "No matches in upcoming meetings" : "No upcoming meetings"}
          />
          <MeetingList
            title="Recent meetings"
            meetings={filteredRecent}
            emptyText={query ? "No matches in recent meetings" : "No recent meetings"}
          />
        </div>
      )}

      <NewMeetingModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={refresh}
      />
      <JoinMeetingModal open={joinOpen} onClose={() => setJoinOpen(false)} />
      <ScheduleMeetingModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onCreated={refresh}
      />
    </div>
  );
}
