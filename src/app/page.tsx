"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  IconPlus,
  IconSearch,
  IconUsers,
  IconTrash,
  IconX,
  IconShare,
  IconEdit,
} from "@/components/Icons";

interface BoardItem {
  id: string;
  title: string;
  description?: string | null;
  coverImage?: string | null;
  archived?: boolean;
  ownerId: string;
  owner: { id: string; name: string | null; email: string };
  members: { role: string; user: { id: string; name: string | null; email: string } }[];
  columns: {
    id: string;
    _count: { cards: number };
    cards?: { tags?: { id: string; name: string }[] }[];
  }[];
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
  const [newBoardDesc, setNewBoardDesc] = useState("");
  const [newBoardCover, setNewBoardCover] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit board modal
  const [editingBoard, setEditingBoard] = useState<BoardItem | null>(null);
  const [editBoardTitle, setEditBoardTitle] = useState("");
  const [editBoardDesc, setEditBoardDesc] = useState("");
  const [editBoardCover, setEditBoardCover] = useState("");
  const [uploadingEditCover, setUploadingEditCover] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editBoardError, setEditBoardError] = useState("");

  const currentUser = session?.user as any;
  const isAdmin = currentUser?.role === "ADMIN";

  // Tag frequency across all boards (cards and titles/descriptions)
  const tagFrequency = useMemo(() => {
    const counts: Record<string, number> = {};
    boards.forEach((b) => {
      b.columns?.forEach((col) => {
        col.cards?.forEach((c) => {
          c.tags?.forEach((t) => {
            counts[t.name] = (counts[t.name] || 0) + 1;
          });
        });
      });
      const text = `${b.title} ${b.description || ""}`;
      const matches = text.match(/#[\w-]+/g);
      matches?.forEach((m) => {
        const clean = m.replace(/^#/, "");
        counts[clean] = (counts[clean] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [boards]);

  // Sidebar Quick Filters state
  const [quickFilters, setQuickFilters] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [newQuickFilterInput, setNewQuickFilterInput] = useState("");
  const [isAddingQuickFilter, setIsAddingQuickFilter] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mytrello_dashboard_filters");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuickFilters(parsed);
          return;
        }
      }
    } catch (e) {}

    if (tagFrequency.length > 0) {
      setQuickFilters(tagFrequency.slice(0, 6).map((t) => t.name));
    } else {
      setQuickFilters(["Frontend", "Sprint24", "Personal"]);
    }
  }, [tagFrequency]);

  const saveQuickFilters = (filters: string[]) => {
    setQuickFilters(filters);
    try {
      localStorage.setItem("mytrello_dashboard_filters", JSON.stringify(filters));
    } catch (e) {}
  };

  const handleRemoveQuickFilter = (tagToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = quickFilters.filter((t) => t.toLowerCase() !== tagToRemove.toLowerCase());
    saveQuickFilters(next);
    if (selectedTag?.toLowerCase() === tagToRemove.toLowerCase()) {
      setSelectedTag(null);
    }
  };

  const handleAddQuickFilter = (tagToAdd: string) => {
    const clean = tagToAdd.replace(/^#/, "").trim();
    if (!clean) return;
    if (!quickFilters.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      const next = [...quickFilters, clean];
      saveQuickFilters(next);
    }
    setNewQuickFilterInput("");
    setIsAddingQuickFilter(false);
  };

  const suggestedTags = useMemo(() => {
    return tagFrequency
      .filter((t) => !quickFilters.some((q) => q.toLowerCase() === t.name.toLowerCase()))
      .slice(0, 5);
  }, [tagFrequency, quickFilters]);

  function openEditModal(e: React.MouseEvent, board: BoardItem) {
    e.preventDefault();
    e.stopPropagation();
    setEditingBoard(board);
    setEditBoardTitle(board.title);
    setEditBoardDesc(board.description || "");
    setEditBoardCover(board.coverImage || "");
    setEditBoardError("");
  }

  async function handleSaveBoardEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingBoard || !editBoardTitle.trim()) return;

    setSavingEdit(true);
    setEditBoardError("");
    try {
      const res = await fetch(`/api/boards/${editingBoard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editBoardTitle.trim(),
          description: editBoardDesc.trim() || null,
          coverImage: editBoardCover.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al actualizar tablero");
      }

      const updated = await res.json();
      setBoards((prev) =>
        prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
      );
      setEditingBoard(null);
    } catch (err: any) {
      setEditBoardError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleUploadEditCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingEditCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setEditBoardCover(data.url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingEditCover(false);
    }
  }

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

  async function handleUploadCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setNewBoardCover(data.url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingCover(false);
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
        body: JSON.stringify({
          title: newBoardTitle.trim(),
          description: newBoardDesc.trim() || undefined,
          coverImage: newBoardCover.trim() || undefined,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setShowCreateModal(false);
        setNewBoardTitle("");
        setNewBoardDesc("");
        setNewBoardCover("");
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

  const filteredBoards = currentTabList.filter((b) => {
    const matchesSearch = search
      ? b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.description?.toLowerCase().includes(search.toLowerCase())
      : true;

    if (!selectedTag) return matchesSearch;

    const tagLower = selectedTag.toLowerCase();
    const isOwner = b.ownerId === currentUser?.id;

    if (tagLower === "personal") {
      if (isOwner) return matchesSearch;
    }
    if (tagLower === "compartido") {
      if (!isOwner) return matchesSearch;
    }

    if (
      b.title.toLowerCase().includes(tagLower) ||
      b.description?.toLowerCase().includes(tagLower)
    ) {
      return matchesSearch;
    }

    const hasTagInCards = b.columns?.some((col) =>
      col.cards?.some((c) =>
        c.tags?.some((t) => t.name.toLowerCase() === tagLower)
      )
    );

    return hasTagInCards && matchesSearch;
  });

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

            {/* Quick Tags Filter (Editable & Dynamic) */}
            <div className="space-y-2.5 pt-3 border-t border-[#4a4455]/20">
              <div className="flex items-center justify-between px-3">
                <span className="text-[10px] uppercase font-bold text-[#958da1] tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs text-[#d2bbff]">filter_list</span>
                  <span>Filtros Rápidos</span>
                </span>
                {selectedTag && (
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="text-[10px] text-red-300 hover:text-red-200 font-bold cursor-pointer"
                    title="Mostrar todos los tableros"
                  >
                    ✕ Ver todos
                  </button>
                )}
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap gap-1.5 px-2">
                {quickFilters.map((tag) => {
                  const isSelected = selectedTag?.toLowerCase() === tag.toLowerCase();
                  const count = tagFrequency.find((t) => t.name.toLowerCase() === tag.toLowerCase())?.count || 0;
                  return (
                    <div
                      key={tag}
                      onClick={() => setSelectedTag(isSelected ? null : tag)}
                      className={`group flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all cursor-pointer select-none ${
                        isSelected
                          ? "bg-[#7c3aed] text-white shadow-sm ring-1 ring-[#cebdff]/40"
                          : "bg-[#7c3aed]/15 text-[#d2bbff] border border-[#7c3aed]/30 hover:bg-[#7c3aed]/25"
                      }`}
                      title={`Filtrar tableros por #${tag} (${count} tarjetas)`}
                    >
                      <span>#{tag}</span>
                      {count > 0 && (
                        <span
                          className={`text-[9px] px-1 rounded-full font-bold ${
                            isSelected ? "bg-white/20 text-white" : "bg-[#7c3aed]/30 text-[#e9def6]"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleRemoveQuickFilter(tag, e)}
                        className="opacity-50 hover:opacity-100 hover:text-red-300 ml-0.5 p-0.5 rounded transition-opacity"
                        title="Eliminar de filtros rápidos"
                      >
                        <IconX className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}

                {/* Add new filter button or input */}
                {isAddingQuickFilter ? (
                  <div className="flex items-center gap-1 bg-[#100b1c] border border-[#7c3aed]/50 rounded-lg px-2 py-0.5 animate-in fade-in zoom-in-95 duration-100">
                    <span className="text-[#958da1] text-xs">#</span>
                    <input
                      type="text"
                      autoFocus
                      placeholder="nuevo-filtro"
                      value={newQuickFilterInput}
                      onChange={(e) => setNewQuickFilterInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddQuickFilter(newQuickFilterInput);
                        } else if (e.key === "Escape") {
                          setIsAddingQuickFilter(false);
                          setNewQuickFilterInput("");
                        }
                      }}
                      className="bg-transparent text-xs text-white focus:outline-none w-20"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddQuickFilter(newQuickFilterInput)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-bold px-0.5"
                      title="Añadir"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingQuickFilter(false);
                        setNewQuickFilterInput("");
                      }}
                      className="text-xs text-[#958da1] hover:text-white px-0.5"
                      title="Cancelar"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingQuickFilter(true)}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-semibold text-[#ccc3d8] hover:text-white bg-white/5 hover:bg-white/10 border border-dashed border-[#4a4455]/40 hover:border-[#7c3aed] flex items-center gap-1 transition-all cursor-pointer"
                    title="Añadir un nuevo filtro rápido a la barra lateral"
                  >
                    <IconPlus className="w-2.5 h-2.5 text-[#d2bbff]" />
                    <span>Añadir</span>
                  </button>
                )}
              </div>

              {/* Suggested Most Used Hashtags in Sidebar */}
              {suggestedTags.length > 0 && (
                <div className="px-2 pt-1 space-y-1">
                  <span className="text-[9px] uppercase font-semibold text-[#958da1] block">
                    Más usadas:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {suggestedTags.map((st) => (
                      <button
                        key={st.name}
                        onClick={() => handleAddQuickFilter(st.name)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-[#ccc3d8] hover:text-white hover:bg-[#7c3aed]/25 border border-white/10 flex items-center gap-1 transition-all cursor-pointer"
                        title={`Añadir #${st.name} a los filtros rápidos (${st.count} tarjetas)`}
                      >
                        <span>+{st.name}</span>
                        <span className="text-[9px] text-[#958da1]">({st.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                  className="glass-card flex flex-col justify-between group relative overflow-hidden rounded-2xl min-h-[230px]"
                >
                  {/* Subtle top refraction line or Cover Image */}
                  {board.coverImage ? (
                    <div className="relative w-full h-24 overflow-hidden shrink-0">
                      <img
                        src={board.coverImage}
                        alt={board.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#161121] via-transparent to-black/30" />
                    </div>
                  ) : (
                    <div className="h-1.5 w-full bg-gradient-to-r from-[#7c3aed] via-[#cebdff] to-[#ae397b]" />
                  )}

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Header Row: Category Badge + Star + Delete */}
                      <div className="flex items-center justify-between gap-2 mb-2">
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
                              onClick={(e) => openEditModal(e, board)}
                              className="p-1 text-[#958da1] hover:text-[#d2bbff] transition-colors"
                              title="Editar tablero"
                            >
                              <IconEdit className="w-4 h-4" />
                            </button>
                          )}

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
                      {board.description && (
                        <p className="text-xs text-[#ccc3d8] mt-1 line-clamp-2">
                          {board.description}
                        </p>
                      )}
                      <p className="text-[11px] text-[#958da1] mt-1">
                        Por: {board.owner?.name || board.owner?.email}
                      </p>
                    </div>

                    {/* Footer Row: Columns, Cards, Avatars */}
                    <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#ccc3d8]">
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

      {/* Modal: Crear Tablero con Portada y Descripción */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal max-w-lg w-full p-6 space-y-5 rounded-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
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
                  Título del Tablero *
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

              <div>
                <label className="block text-xs font-semibold uppercase text-[#ccc3d8] mb-1.5">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Objetivos clave, contexto del equipo o descripción del proyecto..."
                  value={newBoardDesc}
                  onChange={(e) => setNewBoardDesc(e.target.value)}
                  className="glass-input w-full px-3.5 py-2 rounded-xl text-xs resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[#ccc3d8] mb-1.5">
                  Imagen de Portada (Opcional)
                </label>

                {newBoardCover && (
                  <div className="relative mb-2.5 h-28 w-full rounded-xl overflow-hidden ring-2 ring-[#7c3aed]">
                    <img
                      src={newBoardCover}
                      alt="Portada seleccionada"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setNewBoardCover("")}
                      className="absolute top-2 right-2 p-1 rounded-lg bg-black/60 text-white hover:bg-red-500 transition-colors text-xs"
                      title="Eliminar portada"
                    >
                      <IconX className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Cover Presets */}
                <div className="grid grid-cols-4 gap-2 mb-2.5">
                  {[
                    { name: "Nebula", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80" },
                    { name: "Cosmos", url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80" },
                    { name: "Cyber", url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80" },
                    { name: "Ocean", url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80" },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewBoardCover(preset.url)}
                      className={`relative h-12 rounded-lg overflow-hidden border transition-all ${
                        newBoardCover === preset.url
                          ? "border-[#7c3aed] ring-2 ring-[#7c3aed] scale-105"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] font-bold text-white">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="O introduce URL: https://..."
                    value={newBoardCover}
                    onChange={(e) => setNewBoardCover(e.target.value)}
                    className="glass-input flex-1 px-3 py-1.5 rounded-xl text-xs"
                  />
                  <label className="secondary-glass-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer shrink-0">
                    <span className="material-symbols-outlined text-sm text-[#d2bbff]">upload</span>
                    <span>{uploadingCover ? "Subiendo..." : "Subir archivo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadCover}
                      className="hidden"
                      disabled={uploadingCover}
                    />
                  </label>
                </div>
              </div>

              <p className="text-xs text-[#958da1]">
                Se crearán automáticamente las columnas estándar: <span className="text-[#d2bbff] font-semibold">Por Hacer</span>, <span className="text-[#cebdff] font-semibold">En Progreso</span> y <span className="text-emerald-400 font-semibold">Finalizado</span>.
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

      {/* Modal: Editar Tablero */}
      {editingBoard && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal max-w-md w-full p-6 space-y-4 rounded-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d2bbff]">edit</span>
                <span>Editar Tablero</span>
              </h3>
              <button
                onClick={() => setEditingBoard(null)}
                className="text-[#958da1] hover:text-white"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {editBoardError && (
              <div className="p-3 text-xs rounded-xl bg-red-500/15 border border-red-500/30 text-red-200">
                {editBoardError}
              </div>
            )}

            <form onSubmit={handleSaveBoardEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#ccc3d8] mb-1">
                  Nombre del Tablero *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Sprint 25, Proyecto Alpha..."
                  value={editBoardTitle}
                  onChange={(e) => setEditBoardTitle(e.target.value)}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#ccc3d8] mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Breve propósito o alcance del tablero..."
                  value={editBoardDesc}
                  onChange={(e) => setEditBoardDesc(e.target.value)}
                  className="glass-input w-full px-3.5 py-2 rounded-xl text-xs resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#ccc3d8]">
                    Imagen de Portada (Opcional)
                  </label>
                  {editBoardCover && (
                    <button
                      type="button"
                      onClick={() => setEditBoardCover("")}
                      className="text-[11px] text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                    >
                      Quitar portada
                    </button>
                  )}
                </div>

                {editBoardCover && (
                  <div className="relative w-full h-24 rounded-xl overflow-hidden mb-2 border border-white/10">
                    <img
                      src={editBoardCover}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="URL: https://..."
                    value={editBoardCover}
                    onChange={(e) => setEditBoardCover(e.target.value)}
                    className="glass-input flex-1 px-3 py-1.5 rounded-xl text-xs"
                  />
                  <label className="secondary-glass-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer shrink-0">
                    <span className="material-symbols-outlined text-sm text-[#d2bbff]">upload</span>
                    <span>{uploadingEditCover ? "Subiendo..." : "Subir archivo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadEditCover}
                      className="hidden"
                      disabled={uploadingEditCover}
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingBoard(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#ccc3d8] hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || !editBoardTitle.trim()}
                  className="primary-btn px-5 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                >
                  {savingEdit ? "Guardando..." : "Guardar Cambios"}
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
