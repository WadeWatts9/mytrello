"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  IconPlus,
  IconSearch,
  IconUsers,
  IconTrash,
  IconX,
  IconShare,
} from "@/components/Icons";

interface BoardItem {
  id: string;
  title: string;
  ownerId: string;
  owner: { id: string; name: string | null; email: string };
  members: { role: string; user: { id: string; name: string | null; email: string } }[];
  columns: { id: string; _count: { cards: number } }[];
  updatedAt: string;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [boards, setBoards] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "mine" | "shared" | "favorites">("all");
  const [favorites, setFavorites] = useState<string[]>([]);

  // Create board modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const currentUser = session?.user as any;
  const isAdmin = currentUser?.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      loadBoards();
      const savedFavs = localStorage.getItem("favorite_boards");
      if (savedFavs) {
        try {
          setFavorites(JSON.parse(savedFavs));
        } catch {}
      }
    }
  }, [status, router]);

  async function loadBoards() {
    try {
      const res = await fetch("/api/boards");
      if (res.ok) {
        const data = await res.json();
        setBoards(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function toggleFavorite(e: React.MouseEvent, boardId: string) {
    e.preventDefault();
    e.stopPropagation();
    const next = favorites.includes(boardId)
      ? favorites.filter((id) => id !== boardId)
      : [...favorites, boardId];
    setFavorites(next);
    localStorage.setItem("favorite_boards", JSON.stringify(next));
  }

  async function handleCreateBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!newBoardTitle.trim() || creating) return;

    setCreating(true);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newBoardTitle.trim() }),
      });

      if (res.ok) {
        const created = await res.json();
        setShowCreateModal(false);
        setNewBoardTitle("");
        router.push(`/board/${created.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteBoard(e: React.MouseEvent, board: BoardItem) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`¿Eliminar tablero "${board.title}"? Esta acción borrará todas sus columnas y tarjetas.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/boards/${board.id}`, { method: "DELETE" });
      if (res.ok) {
        setBoards((prev) => prev.filter((b) => b.id !== board.id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  const myBoards = boards.filter((b) => b.ownerId === currentUser?.id);
  const sharedBoards = boards.filter((b) => b.ownerId !== currentUser?.id);
  const favBoards = boards.filter((b) => favorites.includes(b.id));

  const currentTabList =
    activeTab === "mine"
      ? myBoards
      : activeTab === "shared"
      ? sharedBoards
      : activeTab === "favorites"
      ? favBoards
      : boards;

  const filteredBoards = currentTabList.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-[#161121] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-[#ccc3d8]">Cargando espacio de trabajo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#161121] text-[#e9def6] flex flex-col overflow-x-hidden selection:bg-[#7c3aed] selection:text-white">
      {/* Navbar with Stitch Design */}
      <Navbar
        onSearchChange={setSearch}
        searchValue={search}
      />

      {/* Global App Shell Layout */}
      <div className="flex flex-1 w-full relative overflow-hidden">
        {/* SideNavBar (Google Stitch Component) */}
        <aside className="hidden lg:flex flex-col justify-between h-[calc(100vh-61px)] w-64 shrink-0 p-4 border-r border-[#4a4455]/20 bg-[#1e192a]/70 backdrop-blur-2xl shadow-xl shadow-[#100b1c]/40">
          {/* Top Section */}
          <div className="space-y-6">
            {/* Workspace Header Card */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#221d2e]/60 border border-[#4a4455]/20">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#4f319c] flex items-center justify-center shadow-md text-white">
                <span className="material-symbols-outlined text-xl">dashboard</span>
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-white truncate">
                  My Trello Space
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] text-[#958da1]">
                    Rol: {isAdmin ? "Administrador" : "Colaborador"}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#958da1] tracking-wider px-3 mb-2 block">
                Navegación
              </span>

              <button
                onClick={() => setActiveTab("all")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "all"
                    ? "bg-[#7c3aed]/25 text-white border border-[#7c3aed]/40 shadow-sm"
                    : "text-[#ccc3d8] hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="material-symbols-outlined text-lg text-[#d2bbff]">view_kanban</span>
                <span>Todos los Tableros</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#7c3aed]/30 text-[#d2bbff] font-bold">
                  {boards.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("mine")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "mine"
                    ? "bg-[#7c3aed]/25 text-white border border-[#7c3aed]/40 shadow-sm"
                    : "text-[#ccc3d8] hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="material-symbols-outlined text-lg text-[#cebdff]">person</span>
                <span>Mis Tableros</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#2d2739] text-[#ccc3d8]">
                  {myBoards.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("shared")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "shared"
                    ? "bg-[#7c3aed]/25 text-white border border-[#7c3aed]/40 shadow-sm"
                    : "text-[#ccc3d8] hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="material-symbols-outlined text-lg text-[#ffafd3]">group</span>
                <span>Compartidos</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#2d2739] text-[#ccc3d8]">
                  {sharedBoards.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("favorites")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "favorites"
                    ? "bg-[#7c3aed]/25 text-white border border-[#7c3aed]/40 shadow-sm"
                    : "text-[#ccc3d8] hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="material-symbols-outlined text-lg text-amber-400">star</span>
                <span>Favoritos</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#2d2739] text-[#ccc3d8]">
                  {favBoards.length}
                </span>
              </button>
            </div>

            {/* Quick Tags Filter (from Stitch Design) */}
            <div className="space-y-2 pt-2 border-t border-[#4a4455]/20">
              <span className="text-[10px] uppercase font-bold text-[#958da1] tracking-wider px-3 block">
                Filtros Rápidos
              </span>
              <div className="flex flex-wrap gap-1.5 px-2">
                <button
                  onClick={() => setSearch("#Frontend")}
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#7c3aed]/20 text-[#cebdff] border border-[#7c3aed]/30 hover:bg-[#7c3aed]/30 transition-colors"
                >
                  #Frontend
                </button>
                <button
                  onClick={() => setSearch("#Sprint24")}
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ae397b]/25 text-[#ffafd3] border border-[#ae397b]/30 hover:bg-[#ae397b]/35 transition-colors"
                >
                  #Sprint24
                </button>
                <button
                  onClick={() => setSearch("#Personal")}
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#2d2739] text-[#ccc3d8] border border-[#4a4455]/30 hover:text-white transition-colors"
                >
                  #Personal
                </button>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/30"
                  >
                    Limpiar ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bottom SQLite Info Widget (Stitch Component) */}
          <div className="space-y-3 pt-4 border-t border-[#4a4455]/20">
            <div className="p-2.5 rounded-xl bg-[#100b1c]/80 border border-[#4a4455]/30 flex flex-col gap-1.5 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#d2bbff] flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">database</span>
                  <span>SQLite Driver</span>
                </span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  SYNCED
                </span>
              </div>
              <div className="w-full bg-[#2d2739] rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#7c3aed] h-full rounded-full w-4/5" />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#958da1]">
                <span>dev.db (:3004)</span>
                <span>ZimaOS Persistent</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-61px)]">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {activeTab === "mine"
                    ? "Mis Tableros"
                    : activeTab === "shared"
                    ? "Tableros Compartidos"
                    : activeTab === "favorites"
                    ? "Tableros Favoritos"
                    : "Todos los Tableros"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#7c3aed]/20 text-[#d2bbff] border border-[#7c3aed]/40">
                  {filteredBoards.length} disponibles
                </span>
              </div>
              <p className="text-xs text-[#ccc3d8] mt-1">
                Visualización y gestión colaborativa de flujos de trabajo en tiempo real.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setNewBoardTitle("");
                  setShowCreateModal(true);
                }}
                className="primary-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-xs sm:text-sm cursor-pointer"
              >
                <IconPlus className="w-4 h-4" />
                <span>Crear Tablero</span>
              </button>
            </div>
          </div>

          {/* Boards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {/* Create Card Trigger */}
            <div
              onClick={() => {
                setNewBoardTitle("");
                setShowCreateModal(true);
              }}
              className="glass-card p-6 h-56 border-2 border-dashed border-[#7c3aed]/30 hover:border-[#7c3aed] flex flex-col items-center justify-center gap-3 cursor-pointer group transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#7c3aed]/20 text-[#d2bbff] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-[#7c3aed]/20">
                <IconPlus className="w-6 h-6" />
              </div>
              <span className="font-bold text-sm text-white group-hover:text-[#d2bbff] transition-colors">
                Crear Nuevo Tablero
              </span>
              <span className="text-xs text-[#958da1] text-center max-w-[200px]">
                Inicia un nuevo sprint, proyecto o lista de tareas
              </span>
            </div>

            {/* Existing Board Cards (Stitch Glass Card Styling) */}
            {filteredBoards.map((board) => {
              const isOwner = board.ownerId === currentUser?.id;
              const canDelete = isOwner || isAdmin;
              const isFav = favorites.includes(board.id);
              const totalCards = board.columns?.reduce((acc, col) => acc + (col._count?.cards || 0), 0) || 0;

              return (
                <Link
                  key={board.id}
                  href={`/board/${board.id}`}
                  className="glass-card p-5 h-56 flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Subtle top refraction line */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#7c3aed] via-[#cebdff] to-[#ae397b]" />

                  <div>
                    {/* Header Row: Category Badge + Star + Delete */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#7c3aed]/20 text-[#d2bbff] border border-[#7c3aed]/35">
                        {isOwner ? "#Personal" : "#Compartido"}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => toggleFavorite(e, board.id)}
                          className="p-1 text-[#958da1] hover:text-amber-400 transition-colors"
                          title="Favorito"
                        >
                          <span
                            className={`material-symbols-outlined text-lg ${
                              isFav ? "text-amber-400 fill-current" : ""
                            }`}
                          >
                            star
                          </span>
                        </button>

                        {canDelete && (
                          <button
                            onClick={(e) => handleDeleteBoard(e, board)}
                            className="p-1 text-[#958da1] hover:text-red-400 transition-colors"
                            title="Eliminar tablero"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-lg text-white group-hover:text-[#d2bbff] transition-colors line-clamp-1">
                      {board.title}
                    </h3>
                    <p className="text-xs text-[#958da1] mt-1 line-clamp-2">
                      Propietario: {board.owner?.name || board.owner?.email}
                    </p>
                  </div>

                  {/* Footer Row: Columns, Cards, Avatars */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#ccc3d8]">
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span>{board.columns?.length || 0} col</span>
                      <span>•</span>
                      <span>{totalCards} tarjetas</span>
                    </div>

                    <div className="flex items-center -space-x-2">
                      <div
                        className="w-7 h-7 rounded-full border-2 border-[#100b1c] bg-[#7c3aed] text-white flex items-center justify-center text-[10px] font-bold"
                        title={board.owner?.name || board.owner?.email}
                      >
                        {board.owner?.name ? board.owner.name[0] : "P"}
                      </div>
                      {board.members?.slice(0, 2).map((m, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full border-2 border-[#100b1c] bg-[#4f319c] text-white flex items-center justify-center text-[10px] font-bold"
                          title={m.user.name || m.user.email}
                        >
                          {m.user.name ? m.user.name[0] : "C"}
                        </div>
                      ))}
                      {board.members && board.members.length > 2 && (
                        <div className="w-7 h-7 rounded-full border-2 border-[#100b1c] bg-[#2d2739] text-[#ccc3d8] flex items-center justify-center text-[9px] font-bold">
                          +{board.members.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {filteredBoards.length === 0 && (
            <div className="text-center py-16 space-y-3 glass-panel p-8 rounded-2xl">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#7c3aed]/20 text-[#d2bbff] flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">view_kanban</span>
              </div>
              <h4 className="text-lg font-bold text-white">No hay tableros en esta sección</h4>
              <p className="text-xs text-[#958da1] max-w-sm mx-auto">
                Crea un nuevo tablero o prueba con otro término de búsqueda.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Modal: Crear Tablero */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d2bbff]">view_kanban</span>
                Crear Nuevo Tablero
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#958da1] hover:text-white"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-[#ccc3d8] mb-1.5">
                  Título del Tablero
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Sprint 24: Core Platform..."
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>

              <p className="text-xs text-[#958da1]">
                Se crearán automáticamente las columnas estándar: <span className="text-[#d2bbff] font-semibold">Por Hacer</span>, <span className="text-[#cebdff] font-semibold">En Progreso</span> y <span className="text-emerald-400 font-semibold">Hecho</span>.
              </p>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#ccc3d8] hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || !newBoardTitle.trim()}
                  className="primary-btn px-5 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                >
                  {creating ? "Creando..." : "Crear Tablero"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
