# Zoom Clone — Video Conferencing Platform

A lightweight Zoom-style web app: sign up / log in, create instant meetings,
schedule future meetings, share invite links, and drop into a mocked in-meeting
room with host controls (mute participant, mute all, remove). Built for the
SDE assignment — clean architecture, JWT auth, no real WebRTC.

## Tech Stack

| Layer      | Technology                                              |
|------------|---------------------------------------------------------|
| Frontend   | Next.js 14 (App Router), TypeScript, Tailwind CSS       |
| Backend    | Python 3.10+, FastAPI, SQLAlchemy 2, Uvicorn            |
| Auth       | JWT (python-jose) + bcrypt (passlib)                    |
| Database   | SQLite                                                  |
| Deploy     | Vercel (frontend) · Railway (backend)                   |

## Project Structure

```
Harshitha/
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app, CORS, router registration, migrations
│   │   ├── database.py         # SQLAlchemy engine + session + light ADD COLUMN migrations
│   │   ├── deps.py             # get_current_user (JWT bearer auth dependency)
│   │   ├── models.py           # User (w/ password_hash), Meeting, Participant (w/ is_muted)
│   │   ├── schemas.py          # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── auth_service.py     # bcrypt hashing + JWT encode/decode
│   │   │   └── meeting_service.py  # Meeting-ID + invite-link generation
│   │   └── routers/
│   │       ├── auth.py         # POST /auth/signup, /auth/login, GET /auth/me
│   │       ├── users.py        # GET /users/me (protected)
│   │       └── meetings.py     # /meetings CRUD + join + host controls
│   ├── seed.py                 # Seeds default user (w/ password) + sample meetings
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx          # Global layout + Navbar + AuthProvider
│   │   ├── page.tsx            # Dashboard (protected: redirects to /login)
│   │   ├── login/page.tsx      # Sign-in form
│   │   ├── signup/page.tsx     # Sign-up form
│   │   ├── join/page.tsx       # /join?id=… landing for invite links (public)
│   │   └── meeting/[id]/page.tsx  # Mocked in-meeting room + host controls
│   ├── components/             # Navbar, ActionButtons, ControlBar, ParticipantTile, …
│   ├── lib/
│   │   ├── api.ts              # fetch wrapper (attaches JWT bearer token)
│   │   ├── auth.tsx            # <AuthProvider /> + useAuth() context
│   │   └── types.ts
│   └── .env.example
│
├── render.yaml                 # Render deploy config for backend
└── README.md
```

## Local Setup

### Prerequisites
- Node.js 18+
- Python 3.10+

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python seed.py                      # creates zoom_clone.db, seeds "You" + 4 meetings
uvicorn app.main:app --reload --port 8000
```

Backend is now at **http://localhost:8000**. Interactive docs at `/docs`.

The seed script prints the default login credentials:

- **Email:** `you@example.com`
- **Password:** `password123`

You can also sign up a fresh account from the frontend.

### 2. Frontend

In a new terminal:

```bash
cd frontend
cp .env.example .env.local          # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

Open **http://localhost:3000**.

## Database Schema

Three tables, all persisted in a single SQLite file.

### `users`
| Column         | Type     | Notes                                     |
|----------------|----------|-------------------------------------------|
| id             | INT PK   |                                           |
| name           | STRING   | e.g. "You"                                |
| email          | STRING   | unique                                    |
| password_hash  | STRING   | bcrypt hash (nullable for legacy rows)    |
| created_at     | DATETIME |                                           |

### `meetings`
| Column         | Type     | Notes                                                   |
|----------------|----------|---------------------------------------------------------|
| id             | INT PK   |                                                         |
| meeting_id     | STRING   | Public ID like `123-456-7890`, unique, indexed          |
| title          | STRING   |                                                         |
| description    | TEXT     | nullable                                                |
| scheduled_time | DATETIME | Used to split upcoming vs. recent                       |
| duration       | INT      | minutes                                                 |
| invite_link    | STRING   | `<frontend>/join?id=<meeting_id>`                       |
| status         | STRING   | `"instant"` \| `"scheduled"`                            |
| created_at     | DATETIME |                                                         |
| host_id        | INT FK   | → `users.id`                                            |

### `participants`
| Column       | Type     | Notes                                          |
|--------------|----------|------------------------------------------------|
| id           | INT PK   |                                                |
| display_name | STRING   | Name typed on join                             |
| is_muted     | BOOLEAN  | Set by host via mute-single / mute-all         |
| joined_at    | DATETIME |                                                |
| meeting_id   | INT FK   | → `meetings.id` (cascade)                      |

**Relationships**
- `User 1 ── * Meeting` via `host_id`
- `Meeting 1 ── * Participant` via `meeting_id` (`cascade="all, delete-orphan"`)

## Meeting ID Generation

Implemented in [backend/app/services/meeting_service.py](backend/app/services/meeting_service.py).

1. Draw a cryptographically-strong 10-digit number with `secrets.randbelow(10**10)`, zero-padded.
2. Format as `XXX-XXX-XXXX` (Zoom-style groups of 3-3-4).
3. Look up the candidate in `meetings.meeting_id`; retry up to 5 times on collision.

Uniqueness is also enforced at the DB layer (`unique=True`), so any race would fail loudly.

## Key API Endpoints

| Method | Path                                                     | Auth | Purpose                                                       |
|--------|----------------------------------------------------------|------|---------------------------------------------------------------|
| POST   | `/auth/signup`                                           | —    | Create account, returns `{access_token, user}`                |
| POST   | `/auth/login`                                            | —    | Log in, returns `{access_token, user}`                        |
| GET    | `/auth/me`                                               | ✓    | Return the current user from the JWT                          |
| GET    | `/users/me`                                             | ✓    | Alias of `/auth/me`                                            |
| GET    | `/meetings?kind=upcoming\|recent`                       | ✓    | List **your** meetings (filter by upcoming/recent)            |
| POST   | `/meetings/instant`                                     | ✓    | Create an instant meeting; the caller becomes host            |
| POST   | `/meetings/schedule`                                    | ✓    | Create a scheduled meeting; the caller becomes host           |
| GET    | `/meetings/{meeting_id}`                                | —    | Fetch one meeting (public so invite-link landing works)       |
| POST   | `/meetings/{meeting_id}/join`                           | —    | Register a participant (guests can join with just a link)     |
| PATCH  | `/meetings/{meeting_id}/participants/{pid}/mute`        | ✓ host | Mute or unmute one participant                              |
| POST   | `/meetings/{meeting_id}/mute-all`                       | ✓ host | Mute every participant currently in the meeting              |
| DELETE | `/meetings/{meeting_id}/participants/{pid}`             | ✓ host | Remove a participant from the meeting                        |

All authenticated routes expect an `Authorization: Bearer <jwt>` header. The
frontend `lib/api.ts` attaches this automatically from `localStorage`.

## Deployment

The repo ships with everything both providers need:

- `backend/railway.json`, `backend/Procfile`, `backend/runtime.txt`, `backend/.python-version` — Railway (backend)
- `frontend/vercel.json` — Vercel (frontend)
- `render.yaml` — legacy, kept for reference; not required for Railway/Vercel

Deploy the backend **first** (you need its URL for the frontend), then the frontend, then update the backend’s CORS to include the Vercel URL.

### 1) Push the repo to GitHub

```bash
cd "path/to/this/repo"
git init
git add .
git commit -m "Prepare for Vercel + Railway deploy"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

`.gitignore` already excludes `.env`, `.venv/`, `node_modules/`, `.next/`, and `*.db` so no secrets or build output are pushed.

### 2) Backend on Railway

1. Go to [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. Open the created service → **Settings**:
   - **Root Directory**: `backend`
   - Leave Build Command / Start Command blank — `railway.json` in `backend/` already sets them.
3. **Variables** tab → add these:
   | Key | Value |
   |---|---|
   | `JWT_SECRET` | a long random string (e.g. `python -c "import secrets;print(secrets.token_urlsafe(48))"`) |
   | `JWT_EXPIRE_MINUTES` | `1440` |
   | `CORS_ORIGINS` | `http://localhost:3000` (update after step 3) |
   | `FRONTEND_BASE_URL` | `http://localhost:3000` (update after step 3) |
   | `DATABASE_URL` | `sqlite:///./zoom_clone.db` (or `sqlite:////data/zoom_clone.db` if you attach a Volume — see below) |
4. **Networking** → **Generate Domain** to expose the service publicly. Copy the resulting URL, e.g. `https://your-api.up.railway.app`.
5. **(Optional — for persistent data)** **Settings** → **Volumes** → **New Volume** → mount at `/data`, then set `DATABASE_URL=sqlite:////data/zoom_clone.db`. Without a volume the SQLite file is wiped on every redeploy (but the seed script re-creates it, so the app still works).
6. Watch the **Deployments** tab. First deploy runs `pip install -r requirements.txt` then `python seed.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Visit the domain — you should see `{"status":"ok","service":"zoom-clone-api"}`.

### 3) Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New… → Project** → import the same GitHub repo.
2. **Root Directory**: `frontend`. Framework will auto-detect as **Next.js** — leave build/output settings on the defaults.
3. **Environment Variables** → add:
   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | your Railway URL from step 2.4, e.g. `https://your-api.up.railway.app` |
4. Click **Deploy**. Copy the resulting URL, e.g. `https://your-app.vercel.app`.

### 4) Wire CORS + invite links back to Vercel

Back on Railway → your backend service → **Variables**:

- `CORS_ORIGINS` → `https://your-app.vercel.app,http://localhost:3000`
- `FRONTEND_BASE_URL` → `https://your-app.vercel.app`

Railway will automatically redeploy. That’s it — open the Vercel URL, sign up, and start a meeting.

### Troubleshooting

| Symptom | Fix |
|---|---|
| Frontend loads but every API call fails with CORS error | Add the exact Vercel URL to `CORS_ORIGINS` on Railway (no trailing slash), redeploy. |
| `NEXT_PUBLIC_API_URL` changes aren’t picked up | Env vars prefixed with `NEXT_PUBLIC_` are baked in at build time — trigger a **Redeploy** on Vercel after changing them. |
| Invite links point at `localhost` | Set `FRONTEND_BASE_URL` on Railway to your Vercel URL and redeploy. |
| Users / meetings disappear after each Railway deploy | Attach a Railway Volume at `/data` and set `DATABASE_URL=sqlite:////data/zoom_clone.db` (see step 2.5). |
| `python-jose` / `bcrypt` build errors on Railway | Runtime is pinned to Python 3.11 via `runtime.txt` + `.python-version`; if you overrode this, revert. |

## Bonus Features Implemented

- **Responsive design** — layout, navbar, action cards, meeting cards, and the
  in-meeting grid + control bar all adapt from single-column mobile through
  tablet up to a 4-up desktop meeting grid using Tailwind breakpoints
  (`sm:` / `md:` / `lg:` / `xl:`). The `<meta viewport>` tag is emitted from
  the Next.js layout for correct scaling.
- **User authentication (signup / login / logout)** — email + password with
  bcrypt hashing and short-lived JWTs (see [backend/app/services/auth_service.py](backend/app/services/auth_service.py)).
  The frontend keeps the JWT in `localStorage` and hydrates the current user
  via `GET /auth/me` on page load (see [frontend/lib/auth.tsx](frontend/lib/auth.tsx)).
  The dashboard redirects unauthenticated users to `/login`; `/join?id=…` and
  `/meeting/[id]` remain public so guests can attend via invite links.
- **Host controls** — the meeting room detects when the current user is the
  meeting host (`meeting.host.id === user.id`) and reveals per-tile **Mute** /
  **Remove** buttons plus a **Mute all** button in the control bar. Actions
  hit the backend and are picked up by other clients via a 4s poll on
  `GET /meetings/{id}`. Server-side mutes flip the tile’s local mute state
  automatically, and being removed bounces you back to the dashboard.

## Assumptions

- **Guests can still join via invite link** without an account — the
  authentication is opt-in for hosts and dashboard users; the join flow just
  asks for a display name if you aren’t signed in.
- **Meeting room is mocked.** No WebRTC — participant tiles are visual
  placeholders and self mute/video toggles only change local UI state. Host
  controls, however, do mutate real backend state.
- **Times are stored/served in UTC.** The frontend renders them in the browser's local timezone via `toLocaleString`.
- **SQLite** is sufficient for this assignment; on Render it lives on a small mounted disk so data survives redeploys.
- **Light in-app migrations** apply `ADD COLUMN` on SQLite for the two fields
  added post-v1.0 (`users.password_hash`, `participants.is_muted`) so existing
  DBs upgrade in place. Production would use Alembic.

## Requirement → Implementation Checklist

| Requirement                                          | Where it lives                                                                                                    |
|------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| **Bonus: Responsive design**                         | [frontend/app/layout.tsx](frontend/app/layout.tsx) (`viewport`), Tailwind `sm/md/lg/xl` breakpoints across [components/](frontend/components/) |
| **Bonus: Auth (signup/login/logout)**                | [backend/app/routers/auth.py](backend/app/routers/auth.py), [backend/app/services/auth_service.py](backend/app/services/auth_service.py), [frontend/lib/auth.tsx](frontend/lib/auth.tsx), [frontend/app/login/page.tsx](frontend/app/login/page.tsx), [frontend/app/signup/page.tsx](frontend/app/signup/page.tsx) |
| **Bonus: Host controls (mute / mute-all / remove)**  | [backend/app/routers/meetings.py](backend/app/routers/meetings.py) (`_require_host`), [frontend/app/meeting/[id]/page.tsx](frontend/app/meeting/[id]/page.tsx), [frontend/components/ControlBar.tsx](frontend/components/ControlBar.tsx), [frontend/components/ParticipantTile.tsx](frontend/components/ParticipantTile.tsx) |
| Landing dashboard (Zoom-style)                       | [frontend/app/page.tsx](frontend/app/page.tsx), [frontend/app/globals.css](frontend/app/globals.css)              |
| Navbar with profile/settings placeholders            | [frontend/components/Navbar.tsx](frontend/components/Navbar.tsx)                                                  |
| New / Join / Schedule primary buttons                | [frontend/components/ActionButtons.tsx](frontend/components/ActionButtons.tsx)                                    |
| Upcoming & Recent meetings from DB                   | [frontend/components/MeetingList.tsx](frontend/components/MeetingList.tsx) + `GET /meetings?kind=…` in [backend/app/routers/meetings.py](backend/app/routers/meetings.py) |
| Instant meeting → unique ID + invite link + redirect | [frontend/components/NewMeetingModal.tsx](frontend/components/NewMeetingModal.tsx), [backend/app/services/meeting_service.py](backend/app/services/meeting_service.py) |
| Join by ID or link, prompt for name, validate meeting| [frontend/components/JoinMeetingModal.tsx](frontend/components/JoinMeetingModal.tsx), [frontend/app/join/page.tsx](frontend/app/join/page.tsx) |
| Schedule form (title/desc/date/duration) + DB save   | [frontend/components/ScheduleMeetingModal.tsx](frontend/components/ScheduleMeetingModal.tsx), `POST /meetings/schedule` |
| Scheduled meetings appear in Upcoming                | [frontend/app/page.tsx](frontend/app/page.tsx) `refresh()` after create                                           |
| In-meeting room with participant tiles               | [frontend/app/meeting/[id]/page.tsx](frontend/app/meeting/[id]/page.tsx), [frontend/components/ParticipantTile.tsx](frontend/components/ParticipantTile.tsx) |
| Mute / Stop Video toggles, Copy invite, Leave        | [frontend/components/ControlBar.tsx](frontend/components/ControlBar.tsx)                                          |
| Dashboard search/filter by title or date             | [frontend/components/SearchBar.tsx](frontend/components/SearchBar.tsx) + `filter()` in [frontend/app/page.tsx](frontend/app/page.tsx) |
| Custom DB schema with relationships                  | [backend/app/models.py](backend/app/models.py)                                                                    |
| Seeded default user + 3–4 sample meetings            | [backend/seed.py](backend/seed.py)                                                                                |
| Modular backend (routers/services/models/schemas)    | [backend/app/](backend/app/)                                                                                       |
| Modular frontend (small reusable components)         | [frontend/components/](frontend/components/)                                                                       |
| Env-driven API URL + CORS                            | [frontend/lib/api.ts](frontend/lib/api.ts), [backend/app/main.py](backend/app/main.py)                            |
| Deployment config                                    | [render.yaml](render.yaml), Deployment section above                                                              |

## Run Locally — Cheat Sheet

```bash
# Backend
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && cp .env.example .env
python seed.py
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend && cp .env.example .env.local
npm install && npm run dev
# open http://localhost:3000
```
