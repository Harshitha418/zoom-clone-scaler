"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the profile menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    router.push("/login");
  }

  const showAuthActions = !loading && !user && pathname !== "/login" && pathname !== "/signup";

  return (
    <header className="bg-white border-b border-surface-border sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <Link href={user ? "/" : "/login"} className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-zoom flex items-center justify-center text-white font-bold shrink-0">
            Z
          </div>
          <span className="font-semibold text-gray-800 truncate">Zoom Clone</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm text-gray-600">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full pl-1 pr-2 sm:pr-3 py-1 hover:bg-surface-muted"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <div
                  className="w-8 h-8 rounded-full bg-zoom-light text-zoom flex items-center justify-center font-semibold"
                  title={user.name}
                >
                  {initials(user.name) || "?"}
                </div>
                <span className="hidden sm:inline text-gray-700 max-w-[10rem] truncate">
                  {user.name}
                </span>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 card p-2 text-sm"
                  role="menu"
                >
                  <div className="px-3 py-2 border-b border-surface-border">
                    <div className="font-medium text-gray-800 truncate">{user.name}</div>
                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                  </div>
                  <button
                    className="w-full text-left px-3 py-2 rounded hover:bg-surface-muted text-gray-700"
                    role="menuitem"
                    disabled
                  >
                    Settings
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 rounded hover:bg-surface-muted text-red-600"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : showAuthActions ? (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded hover:bg-surface-muted"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="btn-primary text-sm px-3 py-1.5"
              >
                Sign up
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
