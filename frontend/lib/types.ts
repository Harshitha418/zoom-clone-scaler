/** Shared types mirroring the FastAPI schemas. */
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Participant {
  id: number;
  display_name: string;
  is_muted: boolean;
  joined_at: string;
}

export interface Meeting {
  id: number;
  meeting_id: string;
  title: string;
  description?: string | null;
  scheduled_time: string; // ISO
  duration: number;
  invite_link: string;
  status: "instant" | "scheduled";
  created_at: string;
  host: User;
  participants: Participant[];
}
