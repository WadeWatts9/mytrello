"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  IconArrowLeft,
  IconLock,
  IconCheck,
  IconPin,
  IconLogOut,
  IconUpload,
} from "@/components/Icons";

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  // Edit fields
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      loadProfile();
    }
  }, [status, router]);

  async function loadProfile() {
    try {
      const res = await fetch("/api/users/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setName(data.name || "");
        setAvatar(data.avatar || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);

    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatar }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar perfil");

      setProfile((prev: any) => ({ ...prev, ...data }));
      if (update) {
        await update({ name: data.name, image: data.avatar, avatar: data.avatar });
      }
      setProfileMessage({ type: "success", text: "¡Perfil actualizado con éxito!" });
    } catch (err: any) {
      setProfileMessage({ type: "error", text: err.message });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setProfileMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al subir avatar");

      setAvatar(data.url);

      // Auto-save uploaded avatar immediately
      const saveRes = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || profile?.name, avatar: data.url }),
      });

      if (saveRes.ok) {
        const savedData = await saveRes.json();
        setProfile((prev: any) => ({ ...prev, ...savedData }));
        if (update) {
          await update({ image: savedData.avatar, avatar: savedData.avatar });
        }
        setProfileMessage({ type: "success", text: "¡Foto de perfil subida y guardada exitosamente!" });
      } else {
        setProfileMessage({ type: "success", text: "Imagen cargada. Pulsa en 'Guardar Cambios' para aplicarla." });
      }
    } catch (err: any) {
      setProfileMessage({ type: "error", text: err.message });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "La nueva contraseña debe tener al menos 6 caracteres" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Las contraseñas no coinciden" });
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cambiar contraseña");

      setPasswordMessage({ type: "success", text: "¡Contraseña actualizada correctamente!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMessage({ type: "error", text: err.message });
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-[#161121] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-[#ccc3d8]">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  const isAdmin = profile?.role === "ADMIN";

  return (
    <div className="min-h-screen bg-[#161121] text-[#e9def6] flex flex-col selection:bg-[#7c3aed] selection:text-white justify-between">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Back and Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-xl text-[#958da1] hover:text-[#d2bbff] hover:bg-white/5 transition-colors"
              title="Volver al inicio"
            >
              <IconArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Mi Perfil
              </h1>
              <p className="text-xs sm:text-sm text-[#958da1]">
                Administra tu identidad, foto de perfil, credenciales y preferencias de cuenta
              </p>
            </div>
          </div>

          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7c3aed]/20 border border-[#7c3aed]/40 text-[#d2bbff] hover:bg-[#7c3aed]/30 text-xs font-bold transition-all shadow-sm"
            >
              <IconPin className="w-4 h-4 text-[#d2bbff]" />
              <span>Panel de Administración</span>
            </Link>
          )}
        </div>

        {/* User Identity Card Banner */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#7c3aed]/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          {/* Avatar display */}
          <div className="relative group shrink-0">
            {avatar ? (
              <img
                src={avatar}
                alt="Avatar"
                className="w-24 h-24 rounded-2xl object-cover ring-4 ring-[#7c3aed]/50 shadow-2xl"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#4f319c] text-white flex items-center justify-center font-bold text-3xl shadow-2xl ring-4 ring-[#7c3aed]/50">
                {profile?.name ? profile.name[0].toUpperCase() : profile?.email ? profile.email[0].toUpperCase() : "U"}
              </div>
            )}
            <span
              className={`absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase shadow-md ${
                isAdmin
                  ? "bg-[#7c3aed] text-white font-bold"
                  : "bg-[#4f319c] text-white"
              }`}
            >
              {profile?.role}
            </span>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {profile?.name || "Sin nombre"}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#7c3aed]/20 text-[#d2bbff] border border-[#7c3aed]/40">
                {profile?.email}
              </span>
            </div>

            <p className="text-xs text-[#958da1]">
              Miembro desde {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "Recientemente"}
            </p>

            {/* Quick Stats */}
            <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4">
              <div className="px-3.5 py-1.5 rounded-xl bg-[#1e192a]/80 border border-[#4a4455]/25 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d2bbff] text-base">dashboard</span>
                <span className="text-xs text-[#ccc3d8]">
                  <strong className="text-white font-mono">{profile?._count?.ownedBoards || 0}</strong> tableros propios
                </span>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-[#1e192a]/80 border border-[#4a4455]/25 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffafd3] text-base">group</span>
                <span className="text-xs text-[#ccc3d8]">
                  <strong className="text-white font-mono">{profile?._count?.memberships || 0}</strong> tableros compartidos
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Two-column layout: Profile Details & Password Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Edit Profile Info Form */}
          <div className="glass-panel p-6 rounded-2xl space-y-5">
            <div className="flex items-center gap-2.5 border-b border-[#4a4455]/30 pb-3">
              <span className="material-symbols-outlined text-[#d2bbff] text-xl">manage_accounts</span>
              <h3 className="text-base font-bold text-white">Información Personal</h3>
            </div>

            {profileMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  profileMessage.type === "success"
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-200"
                    : "bg-red-500/15 border border-red-500/30 text-red-200"
                }`}
              >
                {profileMessage.type === "success" ? <IconCheck className="w-4 h-4 shrink-0" /> : null}
                <span>{profileMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#ccc3d8] mb-1.5">
                  Correo Electrónico (No editable)
                </label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ""}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs text-[#958da1] bg-white/5 cursor-not-allowed border-dashed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#ccc3d8] mb-1.5">
                  Nombre Completo / Alias
                </label>
                <input
                  type="text"
                  required
                  placeholder="Tu nombre..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#ccc3d8]">
                    Foto de Perfil / Avatar (Opcional)
                  </label>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar("")}
                      className="text-[11px] text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                    >
                      Quitar foto
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://ejemplo.com/avatar.jpg o /api/uploads/..."
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      className="glass-input flex-1 px-3.5 py-2 rounded-xl text-xs"
                    />
                    <label className="secondary-glass-btn flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer shrink-0">
                      <IconUpload className="w-3.5 h-3.5 text-[#d2bbff]" />
                      <span>{uploadingAvatar ? "Subiendo..." : "Subir archivo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={uploadingAvatar}
                      />
                    </label>
                  </div>
                  <p className="text-[11px] text-[#958da1]">
                    Opcional: Sube una foto de perfil o introduce una URL externa.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="primary-btn px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="glass-panel p-6 rounded-2xl space-y-5">
            <div className="flex items-center gap-2.5 border-b border-[#4a4455]/30 pb-3">
              <IconLock className="w-5 h-5 text-[#d2bbff]" />
              <h3 className="text-base font-bold text-white">Seguridad &amp; Contraseña</h3>
            </div>

            {passwordMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  passwordMessage.type === "success"
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-200"
                    : "bg-red-500/15 border border-red-500/30 text-red-200"
                }`}
              >
                {passwordMessage.type === "success" ? <IconCheck className="w-4 h-4 shrink-0" /> : null}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#ccc3d8] mb-1.5">
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#ccc3d8] mb-1.5">
                  Nueva Contraseña (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#ccc3d8] mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="primary-btn px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {savingPassword ? "Actualizando..." : "Actualizar Contraseña"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer Session Controls */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs text-[#958da1]">
          <span>Sesión activa iniciada mediante NextAuth</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 text-red-400 hover:text-red-300 font-semibold cursor-pointer"
          >
            <IconLogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
