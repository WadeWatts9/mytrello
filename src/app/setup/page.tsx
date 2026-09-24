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
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
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
        setError(data.error || "Ocurrió un error al configurar la cuenta.");
        return;
      }

      router.push("/login?setup=done");
    } catch {
      setError("Error de red. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#100b1c] text-[#e9def6] relative flex flex-col justify-between overflow-x-hidden selection:bg-[#7c3aed] selection:text-white">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full bg-[#7c3aed]/20 blur-[130px] mix-blend-screen" />
        <div className="absolute top-1/4 -right-48 w-[580px] h-[580px] rounded-full bg-[#4f319c]/30 blur-[140px] mix-blend-screen" />
      </div>

      {/* Header */}
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
            <span className="text-lg font-bold text-white tracking-tight">My Trello</span>
            <p className="text-xs text-[#ccc3d8]/70 leading-none mt-0.5">Configuración Inicial</p>
          </div>
        </div>
      </header>

      {/* Setup Form Container */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-2">
        <div className="w-full max-w-[480px] glass-panel rounded-2xl p-6 sm:p-8 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[2px] bg-gradient-to-r from-transparent via-[#d2bbff] to-transparent" />

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-[#7c3aed]/15 border border-[#7c3aed]/30 mb-3 shadow-inner">
              <Image
                src="/logo.png"
                alt="My Trello Logo"
                width={52}
                height={52}
                className="rounded-xl shadow-md"
              />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Bienvenido a My Trello</h1>
            <p className="text-xs text-[#ccc3d8] mt-1">
              Primer lanzamiento — Crea tu cuenta de Administrador principal
            </p>
          </div>

          <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-xl px-3.5 py-2.5 mb-5 text-xs text-amber-200">
            <span>🔐</span>
            <span>Esta pantalla quedará permanentemente deshabilitada tras crear la cuenta.</span>
          </div>

          {error && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-200 rounded-xl px-4 py-3 text-xs mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-[#e9def6] mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Alan Canto"
                className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block font-medium text-[#e9def6] mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@mitrello.local"
                className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block font-medium text-[#e9def6] mb-1">Contraseña (mínimo 8 caracteres)</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••••••"
                className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block font-medium text-[#e9def6] mb-1">Confirmar Contraseña</label>
              <input
                type="password"
                required
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="••••••••••••"
                className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="primary-btn w-full py-3 px-4 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
            >
              <span>{loading ? "Creando cuenta..." : "Crear Cuenta de Administrador →"}</span>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
