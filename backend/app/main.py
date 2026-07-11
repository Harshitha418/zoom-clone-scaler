"""FastAPI entrypoint. Registers CORS + routers and creates tables on startup."""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .database import Base, engine, run_light_migrations
from .routers import auth, meetings, users

load_dotenv()

app = FastAPI(title="Zoom Clone API", version="1.1.0")

# CORS: read origins from env so Vercel + local both work without code changes.
origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000")
origins = [o.strip() for o in origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    # Auto-create tables. For production migrations you'd use Alembic; overkill here.
    Base.metadata.create_all(bind=engine)
    # Lightweight SQLite ADD COLUMN migrations for schema evolutions since v1.0.
    run_light_migrations()


@app.get("/")
def health():
    return {"status": "ok", "service": "zoom-clone-api"}


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(meetings.router)
