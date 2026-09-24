"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      // Setup complete — redirect to login
      router.push("/login?setup=done");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800">
      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-2xl">
          {/* Logo + Title */}
          <div className="flex flex-col items-center mb-8">
            <Image
              src="/logo.png"
              alt="MyTrello logo"
              width={80}
              height={80}
              className="rounded-xl mb-4 shadow-lg"
            />
            <h1 className="text-2xl font-bold text-white">Welcome to MyTrello</h1>
            <p className="text-sm text-indigo-200 mt-1 text-center">
              First-time setup — create your admin account
            </p>
          </div>

          {/* Badge */}
          <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded-lg px-3 py-2 mb-6">
            <span className="text-amber-300 text-sm">🔐</span>
            <span className="text-amber-200 text-xs">
              This page will be <strong>permanently disabled</strong> once the admin account is created.
            </span>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-indigo-200 mb-1">Full name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                placeholder="Alan Canto"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-indigo-200 mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                placeholder="admin@yourdomain.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-indigo-200 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-indigo-200 mb-1">Confirm password</label>
              <input
                type="password"
                required
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                placeholder="Repeat your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Creating admin account…" : "Create admin account →"}
            </button>
          </form>
        </div>

        <p className="text-center text-indigo-300/50 text-xs mt-6">
          MyTrello by ACDev · Secure self-hosted Kanban
        </p>
      </div>
    </main>
  );
}
