"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/";
  const { login, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already authenticated, bounce to next.
  useEffect(() => {
    if (user) router.replace(nextPath);
  }, [user, router, nextPath]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace(nextPath);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto card p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Sign in</h1>
        <p className="text-sm text-gray-500">Welcome back to Zoom Clone.</p>
      </div>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm text-gray-600">Email</span>
          <input
            className="input mt-1"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Password</span>
          <input
            className="input mt-1"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="text-sm text-gray-600 text-center">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-zoom hover:underline">
          Create one
        </Link>
      </p>
      <p className="text-xs text-gray-400 text-center">
        Demo login: <span className="font-mono">you@example.com</span> /{" "}
        <span className="font-mono">password123</span>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="card p-6 text-gray-500">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}
