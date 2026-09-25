"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const justSetup = params.get("setup") === "done";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: identifier.trim(),
        password: password,
      });

      setLoading(false);

      if (result?.error) {
        setError("Credenciales inválidas. Verifica tu correo y contraseña.");
      } else {
        window.location.href = "/";
      }
    } catch (err: any) {
      setLoading(false);
      setError("Error al iniciar sesión. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="w-full max-w-[460px] glass-panel rounded-2xl p-6 sm:p-8 relative">
      {/* Top Subtle Refraction Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[2px] bg-gradient-to-r from-transparent via-[#d2bbff] to-transparent" />

      {/* Card Title & Logo */}
      <div className="text-center mb-7">
        <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-[#7c3aed]/15 border border-[#7c3aed]/30 mb-3 shadow-inner">
          <Image
            src="/logo.png"
            alt="My Trello Logo"
            width={52}
            height={52}
            className="rounded-xl shadow-md"
          />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Iniciar Sesión</h1>
        <p className="text-sm text-[#ccc3d8] mt-1.5">
          Acceso seguro al espacio de trabajo colaborativo
        </p>
      </div>

      {justSetup && (
        <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-4 py-3 mb-4">
          <span className="text-emerald-400 text-sm">✅</span>
          <span className="text-emerald-200 text-xs font-semibold">
            ¡Cuenta de Administrador creada! Inicia sesión con tus credenciales.
          </span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-200 rounded-xl px-4 py-3 text-xs mb-4">
          {error}
        </div>
      )}

      {/* Credentials Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Field: Email or Username */}
        <div>
          <label className="block text-xs font-medium text-[#e9def6] mb-1.5 flex items-center justify-between">
            <span>Correo electrónico o Usuario</span>
            <span className="font-mono text-[11px] text-[#d2bbff]/70">NextAuth v4</span>
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#958da1] text-lg pointer-events-none">
              alternate_email
            </span>
            <input
              type="text"
              required
              placeholder="tu@correo.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="glass-input w-full pl-11 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-[#958da1]"
            />
          </div>
        </div>

        {/* Field: Password */}
        <div>
          <label className="block text-xs font-medium text-[#e9def6] mb-1.5">
            Contraseña
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#958da1] text-lg pointer-events-none">
              key
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input w-full pl-11 pr-11 py-2.5 rounded-xl text-sm text-white placeholder-[#958da1]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#958da1] hover:text-[#d2bbff] p-1 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-lg">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded bg-[#2d2739] border-[#4a4455] text-[#7c3aed] focus:ring-[#7c3aed]"
            />
            <span className="text-xs text-[#ccc3d8]">Recordar sesión</span>
          </label>
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#ccc3d8]/60">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d2bbff]" /> JWT Session
          </span>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="primary-btn w-full py-3 px-4 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? "Iniciando sesión..." : "Iniciar Sesión"}</span>
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>
      </form>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-[#4a4455]/20 text-center text-xs text-[#958da1]">
        My Trello · AetherKanban Workspace · Docker ZimaOS Ready
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#100b1c] text-[#e9def6] relative flex flex-col justify-between overflow-x-hidden selection:bg-[#7c3aed] selection:text-white">
      {/* Atmospheric Glow Orbs (from Stitch Design) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full bg-[#7c3aed]/20 blur-[130px] mix-blend-screen" />
        <div className="absolute top-1/4 -right-48 w-[580px] h-[580px] rounded-full bg-[#4f319c]/30 blur-[140px] mix-blend-screen" />
        <div className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-[720px] h-[500px] rounded-full bg-[#ae397b]/15 blur-[160px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(124,58,237,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(124,58,237,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      {/* Header Brand Bar */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-tr from-[#7c3aed] to-[#cebdff] p-0.5 shadow-lg shadow-[#7c3aed]/40 border border-white/20">
            <Image
              src="/logo.png"
              alt="My Trello Logo"
              width={40}
              height={40}
              className="w-full h-full object-cover rounded-[10px]"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white tracking-tight">My Trello</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[#d2bbff] bg-[#7c3aed]/20 border border-[#7c3aed]/40 font-semibold tracking-wider">
                AETHER
              </span>
            </div>
            <p className="text-xs text-[#ccc3d8]/70 leading-none mt-0.5">Core Architecture v3.42</p>
          </div>
        </div>

        {/* State status pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e192a]/70 border border-[#4a4455]/30 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-[#ccc3d8] font-medium font-mono">
            Servidor Activo • Docker NextAuth
          </span>
        </div>
      </header>

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-2">
        <Suspense fallback={<div className="glass-panel p-8 text-center text-white">Cargando...</div>}>
          <LoginForm />
        </Suspense>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-[#958da1]/70">
        My Trello by ACDev · Diseñado con Violet Prism
      </footer>
    </main>
  );
}
