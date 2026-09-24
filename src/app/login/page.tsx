"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const justSetup = params.get("setup") === "done";

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      redirect: false,
      email: form.email,
      password: form.password,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="glass rounded-2xl p-8 shadow-2xl">
      <div className="flex flex-col items-center mb-8">
        <Image
          src="/logo.png"
          alt="MyTrello logo"
          width={80}
          height={80}
          className="rounded-xl mb-4 shadow-lg"
        />
        <h1 className="text-2xl font-bold text-white">MyTrello by ACDev</h1>
        <p className="text-sm text-indigo-200 mt-1">Sign in to continue</p>
      </div>

      {justSetup && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-400/30 rounded-lg px-4 py-3 mb-4">
          <span className="text-green-300 text-sm">✅</span>
          <span className="text-green-200 text-sm">Admin account created! Please sign in.</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-lg px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-indigo-200 mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-indigo-200 mb-1">Password</label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            placeholder="Your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 mt-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in…" : "Sign in →"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <Suspense fallback={
          <div className="glass rounded-2xl p-8 text-center text-white">Loading…</div>
        }>
          <LoginForm />
        </Suspense>
        <p className="text-center text-indigo-300/50 text-xs mt-6">
          MyTrello by ACDev · Secure self-hosted Kanban
        </p>
      </div>
    </main>
  );
}
