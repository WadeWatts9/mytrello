"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  IconPin,
  IconUser,
  IconUsers,
  IconPlus,
  IconTrash,
  IconEdit,
  IconSearch,
  IconKanban,
  IconX,
  IconCheck,
  IconShield,
} from "@/components/Icons";
import Link from "next/link";

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  _count?: {
    ownedBoards: number;
    memberships: number;
  };
}

interface BoardItem {
  id: string;
  title: string;
  owner: { id: string; name: string | null; email: string };
  members: any[];
  columns: any[];
  updatedAt: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [boards, setBoards] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"USER" | "ADMIN">("USER");

  const currentUser = session?.user as any;
  const isAdmin = currentUser?.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && !isAdmin) {
      router.push("/");
    } else if (status === "authenticated" && isAdmin) {
      loadData();
    }
  }, [status, isAdmin, router]);

  async function loadData() {
    setLoading(true);
    try {
      const [usersRes, boardsRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/boards"),
      ]);

      if (usersRes.ok) {
        const u = await usersRes.json();
        setUsers(u);
      }
      if (boardsRes.ok) {
        const b = await boardsRes.json();
        setBoards(b);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear usuario");

      setSuccessMsg(`Usuario ${data.email} creado exitosamente.`);
      setShowCreateModal(false);
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      setFormRole("USER");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setErrorMsg("");
    setSuccessMsg("");

    const payload: any = {
      name: formName,
      role: formRole,
    };
    if (formPassword.trim()) {
      payload.password = formPassword;
    }

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar usuario");

      setSuccessMsg(`Usuario ${selectedUser.email} actualizado correctamente.`);
      setShowEditModal(false);
      setSelectedUser(null);
      setFormPassword("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleDeleteUser(user: UserItem) {
    if (!confirm(`¿Estás seguro de que deseas eliminar la cuenta de ${user.email}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar usuario");

      setSuccessMsg(`Usuario ${user.email} eliminado.`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDeleteBoard(board: BoardItem) {
    if (!confirm(`¿Eliminar tablero "${board.title}" y todas sus tarjetas?`)) return;

    try {
      const res = await fetch(`/api/boards/${board.id}`, { method: "DELETE" });
      if (res.ok) {
        setBoards((prev) => prev.filter((b) => b.id !== board.id));
        setSuccessMsg(`Tablero "${board.title}" eliminado.`);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchUser.toLowerCase()))
  );

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#161121] text-[#e9def6] flex flex-col selection:bg-[#7c3aed] selection:text-white">
      <Navbar boardTitle="Panel de Control de Administrador" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <span className="p-2 rounded-2xl bg-[#7c3aed]/20 text-[#d2bbff] border border-[#7c3aed]/40">
                <IconPin className="w-7 h-7" />
              </span>
              Administración de MyTrello
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Gestiona usuarios, permisos de acceso y supervisa todos los tableros del sistema.
            </p>
          </div>

          <button
            onClick={() => {
              setFormName("");
              setFormEmail("");
              setFormPassword("");
              setFormRole("USER");
              setErrorMsg("");
              setShowCreateModal(true);
            }}
            className="primary-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold shadow-lg transition-all hover:scale-[1.02] cursor-pointer w-fit"
          >
            <IconPlus className="w-5 h-5" />
            <span>Crear Usuario</span>
          </button>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconCheck className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-medium">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")} className="text-emerald-600 hover:text-emerald-800">
              <IconX className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-panel p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <IconUsers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                Usuarios Registrados
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {users.length}
              </h3>
            </div>
          </div>

          <div className="glass-panel p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <IconKanban className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                Tableros Totales
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {boards.length}
              </h3>
            </div>
          </div>

          <div className="glass-panel p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <IconShield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                Administradores
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {users.filter((u) => u.role === "ADMIN").length}
              </h3>
            </div>
          </div>
        </div>

        {/* User Management Section */}
        <section className="glass-panel p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <IconUser className="w-5 h-5 text-indigo-500" />
              Gestión de Usuarios
            </h2>

            <div className="relative w-full sm:w-72">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por nombre o correo..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="glass-input pl-9 w-full text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Rol</th>
                  <th className="py-3 px-4 text-center">Tableros</th>
                  <th className="py-3 px-4">Registrado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredUsers.map((user) => {
                  const isCurrent = user.id === currentUser?.id;
                  return (
                    <tr key={user.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold flex items-center justify-center text-xs uppercase">
                            {user.name ? user.name[0] : user.email[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              {user.name || "Sin nombre"}
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-bold">
                                  Tú
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {user.role === "ADMIN" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#7c3aed]/20 text-[#d2bbff] border border-[#7c3aed]/40">
                            <IconPin className="w-3.5 h-3.5" />
                            ADMIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            <IconUser className="w-3.5 h-3.5" />
                            USUARIO
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-600 dark:text-slate-300">
                        {(user._count?.ownedBoards || 0) + (user._count?.memberships || 0)}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setFormName(user.name || "");
                              setFormRole(user.role as any);
                              setFormPassword("");
                              setErrorMsg("");
                              setShowEditModal(true);
                            }}
                            title="Editar usuario"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                          >
                            <IconEdit className="w-4 h-4" />
                          </button>

                          {!isCurrent && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              title="Eliminar usuario"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                            >
                              <IconTrash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Boards Management Section */}
        <section className="glass-panel p-6 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <IconKanban className="w-5 h-5 text-indigo-500" />
            Todos los Tableros ({boards.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((b) => (
              <div key={b.id} className="glass-card p-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/board/${b.id}`}
                      className="text-lg font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      {b.title}
                    </Link>
                    <button
                      onClick={() => handleDeleteBoard(b)}
                      className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                      title="Eliminar tablero"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Creado por: <span className="font-semibold">{b.owner?.name || b.owner?.email}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200/50 dark:border-slate-800 text-xs text-slate-500">
                  <span>{b.columns?.length || 0} columnas</span>
                  <span>{b.members?.length || 0} miembros</span>
                  <Link
                    href={`/board/${b.id}`}
                    className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Abrir →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Modal: Crear Usuario */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-modal max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <IconUser className="w-5 h-5 text-indigo-500" />
                Crear Nuevo Usuario
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Alan Canto"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="glass-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="usuario@ejemplo.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="glass-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Contraseña</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="glass-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Rol</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as any)}
                  className="glass-input w-full cursor-pointer"
                >
                  <option value="USER" className="text-black">Usuario Estándar</option>
                  <option value="ADMIN" className="text-black">Administrador (Control Total)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-md shadow-indigo-500/20"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Usuario */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-modal max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <IconEdit className="w-5 h-5 text-indigo-500" />
                Editar Usuario: {selectedUser.email}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="glass-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Rol</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as any)}
                  className="glass-input w-full cursor-pointer"
                >
                  <option value="USER" className="text-black">Usuario Estándar</option>
                  <option value="ADMIN" className="text-black">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Nueva Contraseña (dejar en blanco para no cambiar)
                </label>
                <input
                  type="password"
                  placeholder="Nueva contraseña opcional..."
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="glass-input w-full"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-md shadow-indigo-500/20"
                >
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACDev Global Footer */}
      <Footer className="mt-auto shrink-0" />
    </div>
  );
}
