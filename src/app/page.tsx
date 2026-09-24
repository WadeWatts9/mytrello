"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  IconKanban,
  IconPlus,
  IconSearch,
  IconUsers,
  IconTrash,
  IconCrown,
  IconX,
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
  const [tab, setTab] = useState<"all" | "mine" | "shared">("all");

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

  const displayedBoards =
    tab === "mine"
      ? myBoards
      : tab === "shared"
      ? sharedBoards
      : boards;

  const filteredBoards = displayedBoards.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Cargando tus tableros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Banner */}
        <div className="glass-panel p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Tableros Kanban Colaborativos
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Hola, {currentUser?.name || currentUser?.email?.split("@")[0]} 👋
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              Organiza tus proyectos, gestiona tareas con arrastrar y soltar, sube imágenes y colabora con tu equipo en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-3 z-10">
            <button
              onClick={() => {
                setNewBoardTitle("");
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <IconPlus className="w-5 h-5" />
              <span>Nuevo Tablero</span>
            </button>
          </div>

          {/* Decorative background glow */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Filter and Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center p-1 rounded-xl bg-slate-200/50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 w-fit">
            <button
              onClick={() => setTab("all")}
              className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                tab === "all"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Todos ({boards.length})
            </button>
            <button
              onClick={() => setTab("mine")}
              className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                tab === "mine"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Mis Tableros ({myBoards.length})
            </button>
            <button
              onClick={() => setTab("shared")}
              className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                tab === "shared"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Compartidos ({sharedBoards.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar tablero..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input pl-9 w-full text-sm"
            />
          </div>
        </div>

        {/* Boards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Card to create new board */}
          <div
            onClick={() => {
              setNewBoardTitle("");
              setShowCreateModal(true);
            }}
            className="glass-card p-6 h-48 border-2 border-dashed border-indigo-300 dark:border-indigo-800/80 hover:border-indigo-500 flex flex-col items-center justify-center gap-3 cursor-pointer group transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
              <IconPlus className="w-6 h-6" />
            </div>
            <span className="font-bold text-sm text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Crear Nuevo Tablero
            </span>
          </div>

          {/* Existing Boards */}
          {filteredBoards.map((board) => {
            const isOwner = board.ownerId === currentUser?.id;
            const canDelete = isOwner || isAdmin;
            const totalCards = board.columns?.reduce((acc, col) => acc + (col._count?.cards || 0), 0) || 0;

            return (
              <Link
                key={board.id}
                href={`/board/${board.id}`}
                className="glass-card p-6 h-48 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Top bar accent */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {board.title}
                    </h3>

                    {canDelete && (
                      <button
                        onClick={(e) => handleDeleteBoard(e, board)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
                        title="Eliminar tablero"
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isOwner ? (
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">Propietario</span>
                    ) : (
                      <span>Por: {board.owner?.name || board.owner?.email}</span>
                    )}
                  </p>
                </div>

                {/* Footer metrics */}
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-3">
                    <span>{board.columns?.length || 0} col</span>
                    <span>•</span>
                    <span>{totalCards} tarjetas</span>
                  </div>

                  {board.members && board.members.length > 0 && (
                    <div className="flex items-center gap-1 text-slate-400" title={`${board.members.length} colaboradores`}>
                      <IconUsers className="w-3.5 h-3.5" />
                      <span>{board.members.length}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {filteredBoards.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <IconKanban className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300">No se encontraron tableros</h4>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Crea tu primer tablero Kanban para empezar a organizar tus proyectos.
            </p>
          </div>
        )}
      </main>

      {/* Modal: Crear Tablero */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-modal max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <IconKanban className="w-5 h-5 text-indigo-500" />
                Crear Nuevo Tablero
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                  Título del Tablero
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Proyecto Web 2026, Tareas Semanales..."
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  className="glass-input w-full text-base"
                />
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Se inicializará automáticamente con las columnas: <span className="font-semibold text-indigo-500">Por Hacer</span>, <span className="font-semibold text-purple-500">En Progreso</span> y <span className="font-semibold text-emerald-500">Hecho</span>. Podrás añadir más después.
              </p>

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
                  disabled={creating || !newBoardTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold transition-all shadow-md shadow-indigo-500/20"
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
