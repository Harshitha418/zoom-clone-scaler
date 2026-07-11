/** Thin fetch wrapper. Uses NEXT_PUBLIC_API_URL so we can deploy without code changes. */
import type { AuthResponse, Meeting, Participant, User } from "./types";

const BASE = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");

const TOKEN_KEY = "zoom_clone_token";

// --- Token storage (localStorage, guarded for SSR) --------------------------
export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TOKEN_KEY);
  },
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore */
    }
    const err: Error & { status?: number } = new Error(
      detail || `Request failed: ${res.status}`
    );
    err.status = res.status;
    throw err;
  }
  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const api = {
  // ----- Auth -----
  signup: (payload: { name: string; email: string; password: string }) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: () => request<User>("/auth/me"),

  // ----- Meetings -----
  listMeetings: (kind?: "upcoming" | "recent") =>
    request<Meeting[]>(`/meetings${kind ? `?kind=${kind}` : ""}`),
  getMeeting: (meetingId: string) =>
    request<Meeting>(`/meetings/${meetingId}`),
  createInstant: (title?: string) =>
    request<Meeting>("/meetings/instant", {
      method: "POST",
      body: JSON.stringify({ title: title || "Instant Meeting" }),
    }),
  createScheduled: (payload: {
    title: string;
    description?: string;
    scheduled_time: string;
    duration: number;
  }) =>
    request<Meeting>("/meetings/schedule", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  join: (meetingId: string, displayName: string) =>
    request<Participant>(`/meetings/${meetingId}/join`, {
      method: "POST",
      body: JSON.stringify({ display_name: displayName }),
    }),

  // ----- Host controls -----
  muteParticipant: (meetingId: string, participantId: number, muted: boolean) =>
    request<Participant>(
      `/meetings/${meetingId}/participants/${participantId}/mute`,
      {
        method: "PATCH",
        body: JSON.stringify({ muted }),
      }
    ),
  muteAll: (meetingId: string) =>
    request<Participant[]>(`/meetings/${meetingId}/mute-all`, {
      method: "POST",
    }),
  removeParticipant: (meetingId: string, participantId: number) =>
    request<void>(`/meetings/${meetingId}/participants/${participantId}`, {
      method: "DELETE",
    }),
};
