"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconShare,
  IconTag,
  IconImage,
  IconLink,
  IconX,
  IconUpload,
  IconExternalLink,
  IconEdit,
} from "@/components/Icons";

import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TagItem {
  id: string;
  name: string;
}

interface ImageItem {
  id: string;
  url: string;
  type: string;
}

interface LinkItem {
  id: string;
  url: string;
  title: string | null;
}

interface CardItem {
  id: string;
  title: string;
  description: string | null;
  order: number;
  archived?: boolean;
  columnId: string;
  tags: TagItem[];
  images: ImageItem[];
  links: LinkItem[];
}

interface ColumnItem {
  id: string;
  title: string;
  order: number;
  cards: CardItem[];
}

interface BoardData {
  id: string;
  title: string;
  description?: string | null;
  coverImage?: string | null;
  archivedCount?: number;
  ownerId: string;
  accessRole: "OWNER" | "EDITOR" | "VIEWER";
  owner: { id: string; name: string | null; email: string };
  members: { role: string; user: { id: string; name: string | null; email: string } }[];
  columns: ColumnItem[];
}

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params?.id as string;
  const { data: session, status } = useSession();

  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  // Modals
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [newCardModalColId, setNewCardModalColId] = useState<string | null>(null);

  // Quick card inline title
  const [newCardTitles, setNewCardTitles] = useState<Record<string, string>>({});

  // Share form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"VIEWER" | "EDITOR">("EDITOR");
  const [shareError, setShareError] = useState("");
  const [shareSuccess, setShareSuccess] = useState("");

  // Archive modal & state
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archivedCards, setArchivedCards] = useState<any[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState("");

  async function loadArchivedCards() {
    setLoadingArchive(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/archive`);
      if (res.ok) {
        const data = await res.json();
        setArchivedCards(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingArchive(false);
    }
  }

  async function handleRestoreCard(cardId: string) {
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });
      if (res.ok) {
        const restored = await res.json();
        setArchivedCards((prev) => prev.filter((c) => c.id !== cardId));
        setBoard((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            archivedCount: Math.max(0, (prev.archivedCount || 1) - 1),
            columns: prev.columns.map((col) =>
              col.id === restored.columnId
                ? { ...col, cards: [...col.cards, restored] }
                : col
            ),
          };
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteArchivedCard(cardId: string) {
    if (!confirm("¿Eliminar definitivamente esta tarjeta? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
      if (res.ok) {
        setArchivedCards((prev) => prev.filter((c) => c.id !== cardId));
        setBoard((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            archivedCount: Math.max(0, (prev.archivedCount || 1) - 1),
          };
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && boardId) {
      loadBoard();
    }
  }, [status, boardId, router]);

  async function loadBoard() {
    try {
      const res = await fetch(`/api/boards/${boardId}`);
      if (!res.ok) {
        if (res.status === 403 || res.status === 404) router.push("/");
        return;
      }
      const data = await res.json();
      setBoard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const isReadOnly = board?.accessRole === "VIEWER";

  // Tag frequency across all active cards in the board
  const tagFrequency = useMemo(() => {
    if (!board) return [];
    const counts: Record<string, number> = {};
    board.columns?.forEach((col) => {
      col.cards?.forEach((c) => {
        c.tags?.forEach((t) => {
          counts[t.name] = (counts[t.name] || 0) + 1;
        });
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [board]);

  const allTags = useMemo(() => tagFrequency.map((t) => t.name), [tagFrequency]);

  // Quick Filters state
  const [quickFilters, setQuickFilters] = useState<string[]>([]);
  const [newQuickFilterInput, setNewQuickFilterInput] = useState("");
  const [isAddingQuickFilter, setIsAddingQuickFilter] = useState(false);

  // Initialize and sync quick filters
  useEffect(() => {
    if (!boardId) return;
    try {
      const saved = localStorage.getItem(`mytrello_filters_${boardId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuickFilters(parsed);
          return;
        }
      }
    } catch (e) {}

    // Default to top 6 most used tags
    if (tagFrequency.length > 0) {
      setQuickFilters(tagFrequency.slice(0, 6).map((t) => t.name));
    }
  }, [boardId, tagFrequency]);

  const saveQuickFilters = (filters: string[]) => {
    setQuickFilters(filters);
    try {
      localStorage.setItem(`mytrello_filters_${boardId}`, JSON.stringify(filters));
    } catch (e) {}
  };

  const handleRemoveQuickFilter = (tagToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = quickFilters.filter((t) => t !== tagToRemove);
    saveQuickFilters(next);
    if (selectedTag === tagToRemove) {
      setSelectedTag(null);
    }
  };

  const handleAddQuickFilter = (tagToAdd: string) => {
    const clean = tagToAdd.replace(/^#/, "").trim();
    if (!clean) return;
    if (!quickFilters.includes(clean)) {
      const next = [...quickFilters, clean];
      saveQuickFilters(next);
    }
    setNewQuickFilterInput("");
    setIsAddingQuickFilter(false);
  };

  const suggestedTags = useMemo(() => {
    return tagFrequency.filter((t) => !quickFilters.includes(t.name)).slice(0, 6);
  }, [tagFrequency, quickFilters]);

  // Edit Board Modal state & handlers
  const [showEditBoardModal, setShowEditBoardModal] = useState(false);
  const [editBoardTitle, setEditBoardTitle] = useState("");
  const [editBoardDesc, setEditBoardDesc] = useState("");
  const [editBoardCover, setEditBoardCover] = useState("");
  const [uploadingBoardCover, setUploadingBoardCover] = useState(false);
  const [savingBoardEdit, setSavingBoardEdit] = useState(false);
  const [editBoardError, setEditBoardError] = useState("");

  async function handleSaveBoardEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editBoardTitle.trim() || isReadOnly) return;

    setSavingBoardEdit(true);
    setEditBoardError("");
    try {
      const res = await fetch(`/api/boards/${boardId}`, {
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
      setBoard((prev) => (prev ? { ...prev, ...updated } : prev));
      setShowEditBoardModal(false);
    } catch (err: any) {
      setEditBoardError(err.message);
    } finally {
      setSavingBoardEdit(false);
    }
  }

  async function handleUploadBoardCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBoardCover(true);
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
      setUploadingBoardCover(false);
    }
  }

  // Handle adding card
  async function handleAddCard(columnId: string, customTitle?: string) {
    const title = (customTitle || newCardTitles[columnId])?.trim();
    if (!title || isReadOnly) return;

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId, title }),
      });

      if (res.ok) {
        const createdCard = await res.json();
        setBoard((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            columns: prev.columns.map((c) =>
              c.id === columnId ? { ...c, cards: [...c.cards, createdCard] } : c
            ),
          };
        });
        setNewCardTitles((prev) => ({ ...prev, [columnId]: "" }));
        setNewCardModalColId(null);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Handle adding column
  async function handleAddColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!newColumnTitle.trim() || isReadOnly) return;

    try {
      const res = await fetch(`/api/boards/${boardId}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newColumnTitle.trim() }),
      });

      if (res.ok) {
        const createdCol = await res.json();
        setBoard((prev) => {
          if (!prev) return prev;
          return { ...prev, columns: [...prev.columns, { ...createdCol, cards: [] }] };
        });
        setNewColumnTitle("");
        setAddingColumn(false);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Handle deleting column
  async function handleDeleteColumn(columnId: string) {
    if (isReadOnly) return;
    if (!confirm("¿Eliminar columna y todas sus tarjetas?")) return;

    try {
      const res = await fetch(`/api/boards/${boardId}/columns`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId }),
      });

      if (res.ok) {
        setBoard((prev) => {
          if (!prev) return prev;
          return { ...prev, columns: prev.columns.filter((c) => c.id !== columnId) };
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  function findColumn(cols: ColumnItem[], id: string) {
    return cols.find((c) => c.id === id || c.cards.some((card) => card.id === id));
  }

  // DnD Handlers
  function handleDragStart(event: DragStartEvent) {
    if (isReadOnly) return;
    setActiveCardId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    if (isReadOnly || !board) return;
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeCol = findColumn(board.columns, activeId);
    const overCol = findColumn(board.columns, overId);

    if (!activeCol || !overCol || activeCol.id === overCol.id) return;

    setBoard((prev) => {
      if (!prev) return prev;
      const sIndex = prev.columns.findIndex((c) => c.id === activeCol.id);
      const tIndex = prev.columns.findIndex((c) => c.id === overCol.id);
      if (sIndex === -1 || tIndex === -1) return prev;

      const sCol = prev.columns[sIndex];
      const tCol = prev.columns[tIndex];

      const cIndex = sCol.cards.findIndex((c) => c.id === activeId);
      if (cIndex === -1) return prev;

      const cardToMove = { ...sCol.cards[cIndex], columnId: tCol.id };
      const newSourceCards = sCol.cards.filter((c) => c.id !== activeId);

      const overIndex = tCol.cards.findIndex((c) => c.id === overId);
      const newTargetCards = [...tCol.cards];
      if (overIndex >= 0) {
        newTargetCards.splice(overIndex, 0, cardToMove);
      } else {
        newTargetCards.push(cardToMove);
      }

      const nextCols = [...prev.columns];
      nextCols[sIndex] = { ...sCol, cards: newSourceCards };
      nextCols[tIndex] = { ...tCol, cards: newTargetCards };

      return { ...prev, columns: nextCols };
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveCardId(null);
    if (isReadOnly || !board) return;

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeCol = findColumn(board.columns, activeId);
    const overCol = findColumn(board.columns, overId);

    if (!activeCol) return;

    const finalCol = overCol || activeCol;
    const oldIndex = activeCol.cards.findIndex((c) => c.id === activeId);
    const newIndex = finalCol.cards.findIndex((c) => c.id === overId);

    if (activeCol.id === finalCol.id && oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      setBoard((prev) => {
        if (!prev) return prev;
        const colIndex = prev.columns.findIndex((c) => c.id === finalCol.id);
        if (colIndex === -1) return prev;
        const col = prev.columns[colIndex];
        const reordered = arrayMove(col.cards, oldIndex, newIndex);
        const nextCols = [...prev.columns];
        nextCols[colIndex] = { ...col, cards: reordered };
        return { ...prev, columns: nextCols };
      });
    }

    const targetIndex = newIndex >= 0 ? newIndex : finalCol.cards.length - 1;

    try {
      await fetch("/api/cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: activeId,
          targetColumnId: finalCol.id,
          newOrder: Math.max(0, targetIndex),
        }),
      });
    } catch (err) {
      console.error("Error al persistir movimiento de tarjeta:", err);
    }
  }

  // Handle Share Member
  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setShareError("");
    setShareSuccess("");

    try {
      const res = await fetch(`/api/boards/${boardId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al invitar usuario");

      setShareSuccess(`Colaborador ${data.user.email} añadido como ${data.role}.`);
      setInviteEmail("");
      loadBoard();
    } catch (err: any) {
      setShareError(err.message);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("¿Eliminar acceso a este miembro?")) return;
    try {
      const res = await fetch(`/api/boards/${boardId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) loadBoard();
    } catch (err) {
      console.error(err);
    }
  }

  const activeCard = useMemo(() => {
    if (!activeCardId || !board) return null;
    for (const col of board.columns) {
      const found = col.cards.find((c) => c.id === activeCardId);
      if (found) return found;
    }
    return null;
  }, [activeCardId, board]);

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-[#161121] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-[#ccc3d8]">Cargando tablero...</p>
        </div>
      </div>
    );
  }

  if (!board) return null;

  return (
    <div className="min-h-screen bg-[#161121] text-[#e9def6] flex flex-col overflow-hidden selection:bg-[#7c3aed] selection:text-white">
      {/* Top Navbar */}
      <Navbar
        boardTitle={board.title}
        boardRole={board.accessRole}
        onShareClick={() => setShowShareModal(true)}
        onSearchChange={setSearchFilter}
        searchValue={searchFilter}
      />

      {/* Optional Board Cover Image Banner */}
      {board.coverImage && (
        <div className="relative w-full h-32 sm:h-44 overflow-hidden shrink-0 border-b border-[#4a4455]/20">
          <img
            src={board.coverImage}
            alt={board.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#161121] via-black/40 to-transparent" />
        </div>
      )}

      {/* Board Header Toolbar (from Stitch Design) */}
      <div className="px-6 sm:px-8 py-4 border-b border-[#4a4455]/20 bg-[#100b1c]/60 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-xl text-[#958da1] hover:text-[#d2bbff] hover:bg-white/5 transition-colors"
            title="Volver"
          >
            <IconArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {board.title}
              </h1>
              {!isReadOnly && (
                <button
                  onClick={() => {
                    setEditBoardTitle(board.title);
                    setEditBoardDesc(board.description || "");
                    setEditBoardCover(board.coverImage || "");
                    setEditBoardError("");
                    setShowEditBoardModal(true);
                  }}
                  className="p-1 rounded-lg text-[#958da1] hover:text-[#d2bbff] hover:bg-white/5 transition-colors"
                  title="Editar nombre, descripción y portada del tablero"
                >
                  <IconEdit className="w-4 h-4" />
                </button>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#7c3aed]/20 text-[#d2bbff] border border-[#7c3aed]/40">
                {isReadOnly ? "Modo Lector" : "En Progreso"}
              </span>
            </div>
            <p className="text-xs text-[#958da1] mt-0.5">
              Propietario: {board.owner?.name || board.owner?.email} • Sincronización SQLite continua
            </p>
            {board.description && (
              <p className="text-xs text-[#ccc3d8] mt-1 max-w-xl">
                {board.description}
              </p>
            )}
          </div>
        </div>

        {/* Board Actions & Filters */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Member Avatar Stack with Role Indicators (Stitch Spec) */}
          <div className="flex items-center -space-x-2.5 pr-2">
            <div className="relative group" title={`${board.owner?.name || board.owner?.email} (Propietario)`}>
              <div className="w-8 h-8 rounded-full border-2 border-[#090514] overflow-hidden bg-[#7c3aed] text-white flex items-center justify-center font-bold text-xs ring-1 ring-[#7c3aed]/40">
                {board.owner?.name ? board.owner.name[0] : "P"}
              </div>
              <span className="absolute -bottom-1 -right-1 text-[8px] bg-[#7c3aed] text-white px-1 rounded-full font-bold">
                Adm
              </span>
            </div>

            {board.members?.map((m, idx) => (
              <div
                key={idx}
                className="relative group"
                title={`${m.user.name || m.user.email} (${m.role})`}
              >
                <div className="w-8 h-8 rounded-full border-2 border-[#090514] overflow-hidden bg-[#4f319c] text-white flex items-center justify-center font-bold text-xs ring-1 ring-[#cebdff]/40">
                  {m.user.name ? m.user.name[0] : m.user.email[0].toUpperCase()}
                </div>
                <span className="absolute -bottom-1 -right-1 text-[8px] bg-[#4f319c] text-white px-1 rounded-full font-bold">
                  {m.role === "EDITOR" ? "Ed" : "Vw"}
                </span>
              </div>
            ))}
          </div>

          <div className="h-6 w-px bg-[#4a4455]/30" />

          {/* Archive Button */}
          <button
            onClick={() => {
              loadArchivedCards();
              setShowArchiveModal(true);
            }}
            className="secondary-glass-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white cursor-pointer"
            title="Ver tarjetas archivadas de este tablero"
          >
            <span className="material-symbols-outlined text-sm text-[#d2bbff]">inventory_2</span>
            <span>📦 Archivo ({board.archivedCount || 0})</span>
          </button>

          {/* Manage Members Button */}
          {!isReadOnly && (
            <button
              onClick={() => {
                setShareError("");
                setShareSuccess("");
                setShowShareModal(true);
              }}
              className="secondary-glass-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-[#d2bbff]">manage_accounts</span>
              <span>👤 Gestionar Miembros ({board.members?.length || 0})</span>
            </button>
          )}

          {/* Edit Board Settings Button */}
          {!isReadOnly && (
            <button
              onClick={() => {
                setEditBoardTitle(board.title);
                setEditBoardDesc(board.description || "");
                setEditBoardCover(board.coverImage || "");
                setEditBoardError("");
                setShowEditBoardModal(true);
              }}
              className="secondary-glass-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white cursor-pointer"
              title="Editar título, descripción y portada del tablero"
            >
              <IconEdit className="w-3.5 h-3.5 text-[#d2bbff]" />
              <span>⚙️ Ajustes Tablero</span>
            </button>
          )}

          {/* Add Column Button */}
          {!isReadOnly && (
            <button
              onClick={() => setAddingColumn(true)}
              className="secondary-glass-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-emerald-400">add_box</span>
              <span>➕ Añadir Columna</span>
            </button>
          )}

          {/* New Card Modal Button */}
          {!isReadOnly && board.columns.length > 0 && (
            <button
              onClick={() => setNewCardModalColId(board.columns[0].id)}
              className="primary-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer"
            >
              <IconPlus className="w-3.5 h-3.5" />
              <span>+ Nueva Tarjeta</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Filters Sub-Bar (Filtros Rápidos interactivos) */}
      <div className="px-6 sm:px-8 py-2.5 border-b border-[#4a4455]/20 bg-[#161121]/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-[#958da1] font-semibold mr-1">
            <span className="material-symbols-outlined text-sm text-[#d2bbff]">filter_list</span>
            <span>Filtros Rápidos:</span>
          </div>

          {/* Reset / View All */}
          {selectedTag && (
            <button
              onClick={() => setSelectedTag(null)}
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center gap-1 cursor-pointer"
              title="Mostrar todas las tarjetas"
            >
              <span>✕ Ver Todos</span>
            </button>
          )}

          {/* Quick Filter chips */}
          {quickFilters.map((tag) => {
            const isSelected = selectedTag === tag;
            const count = tagFrequency.find((t) => t.name === tag)?.count || 0;
            return (
              <div
                key={tag}
                onClick={() => setSelectedTag(isSelected ? null : tag)}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer select-none ${
                  isSelected
                    ? "bg-[#7c3aed] text-white shadow-sm ring-1 ring-[#cebdff]/40"
                    : "bg-[#7c3aed]/15 text-[#d2bbff] border border-[#7c3aed]/30 hover:bg-[#7c3aed]/25"
                }`}
                title={`Filtrar por #${tag} (${count} tarjetas)`}
              >
                <span>#{tag}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded-full font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-[#7c3aed]/30 text-[#e9def6]"
                    }`}
                  >
                    {count}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => handleRemoveQuickFilter(tag, e)}
                  className="opacity-60 hover:opacity-100 hover:text-red-300 ml-0.5 p-0.5 rounded transition-opacity"
                  title="Eliminar de filtros rápidos"
                >
                  <IconX className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Add Filter inline */}
          {isAddingQuickFilter ? (
            <div className="flex items-center gap-1.5 bg-[#100b1c] border border-[#7c3aed]/50 rounded-lg px-2 py-0.5 animate-in fade-in zoom-in-95 duration-100">
              <span className="text-[#958da1] text-xs">#</span>
              <input
                type="text"
                autoFocus
                placeholder="nuevo-hashtag"
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
                className="bg-transparent text-xs text-white focus:outline-none w-28"
              />
              <button
                type="button"
                onClick={() => handleAddQuickFilter(newQuickFilterInput)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold px-1"
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
                className="text-xs text-[#958da1] hover:text-white px-1"
                title="Cancelar"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingQuickFilter(true)}
              className="px-2 py-1 rounded-lg text-xs font-semibold text-[#ccc3d8] hover:text-white bg-white/5 hover:bg-white/10 border border-dashed border-[#4a4455]/40 hover:border-[#7c3aed] flex items-center gap-1 transition-all cursor-pointer"
              title="Añadir un nuevo filtro rápido"
            >
              <IconPlus className="w-3 h-3 text-[#d2bbff]" />
              <span>Añadir filtro</span>
            </button>
          )}

          {quickFilters.length === 0 && tagFrequency.length > 0 && (
            <button
              onClick={() => setQuickFilters(tagFrequency.slice(0, 6).map((t) => t.name))}
              className="text-[11px] text-[#cebdff] hover:underline cursor-pointer ml-1"
            >
              Cargar más usados
            </button>
          )}
        </div>

        {/* Suggested Top Tags */}
        {suggestedTags.length > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 text-xs">
            <span className="text-[11px] text-[#958da1]">Más usadas:</span>
            {suggestedTags.map((st) => (
              <button
                key={st.name}
                onClick={() => handleAddQuickFilter(st.name)}
                className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-white/5 text-[#ccc3d8] hover:text-white hover:bg-[#7c3aed]/20 border border-white/10 flex items-center gap-1 transition-all cursor-pointer"
                title={`Añadir #${st.name} a los filtros rápidos (${st.count} tarjetas)`}
              >
                <span>+{st.name}</span>
                <span className="text-[9px] text-[#958da1]">({st.count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Kanban Canvas */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 sm:p-8 flex gap-6 items-start">
          {board.columns.map((column, idx) => {
            const columnCards = column.cards.filter((c) => {
              const matchesTag = selectedTag
                ? c.tags?.some((t) => t.name === selectedTag)
                : true;
              const matchesSearch = searchFilter
                ? c.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                  c.tags?.some((t) => t.name.toLowerCase().includes(searchFilter.toLowerCase()))
                : true;
              return matchesTag && matchesSearch;
            });

            const emojiIcons = ["💡", "⚡", "🧪", "🚀", "✅", "📌", "🔥"];
            const iconEmoji = emojiIcons[idx % emojiIcons.length];

            return (
              <KanbanColumn
                key={column.id}
                column={column}
                iconEmoji={iconEmoji}
                cards={columnCards}
                isReadOnly={isReadOnly}
                onAddCard={(colId) => handleAddCard(colId)}
                onDeleteColumn={handleDeleteColumn}
                cardTitleInput={newCardTitles[column.id] || ""}
                setCardTitleInput={(val) =>
                  setNewCardTitles((prev) => ({ ...prev, [column.id]: val }))
                }
                onCardClick={(card) => setSelectedCard(card)}
              />
            );
          })}

          {/* Inline Add Column Form */}
          {!isReadOnly && (
            <div className="w-[316px] shrink-0">
              {addingColumn ? (
                <form
                  onSubmit={handleAddColumn}
                  className="glass-panel p-4 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150"
                >
                  <input
                    type="text"
                    autoFocus
                    placeholder="Título de la columna (ej. Pruebas)..."
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    className="glass-input w-full text-xs px-3 py-2 rounded-xl"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAddingColumn(false);
                        setNewColumnTitle("");
                      }}
                      className="px-3 py-1.5 text-xs text-[#958da1] hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="primary-btn px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm"
                    >
                      Guardar Columna
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setAddingColumn(true)}
                  className="w-full py-4 px-5 rounded-2xl border-2 border-dashed border-[#7c3aed]/30 hover:border-[#7c3aed] text-white hover:text-[#d2bbff] flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer bg-[#1e192a]/50 backdrop-blur-xl"
                >
                  <IconPlus className="w-4 h-4" />
                  <span>Añadir Columna</span>
                </button>
              )}
            </div>
          )}
        </div>

        <DragOverlay>
          {activeCard ? <CardOverlay card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Modal: Card Detail */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          isReadOnly={isReadOnly}
          onClose={() => setSelectedCard(null)}
          onCardUpdated={(updated) => {
            setBoard((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                columns: prev.columns.map((col) => ({
                  ...col,
                  cards: col.cards.map((c) => (c.id === updated.id ? updated : c)),
                })),
              };
            });
            setSelectedCard(updated);
          }}
          onCardDeleted={(deletedId) => {
            setBoard((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                columns: prev.columns.map((col) => ({
                  ...col,
                  cards: col.cards.filter((c) => c.id !== deletedId),
                })),
              };
            });
            setSelectedCard(null);
          }}
          onCardArchived={(archivedId) => {
            setBoard((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                archivedCount: (prev.archivedCount || 0) + 1,
                columns: prev.columns.map((col) => ({
                  ...col,
                  cards: col.cards.filter((c) => c.id !== archivedId),
                })),
              };
            });
            setSelectedCard(null);
          }}
        />
      )}

      {/* Modal: Archive */}
      {showArchiveModal && (
        <ArchiveModal
          isReadOnly={isReadOnly}
          cards={archivedCards}
          loading={loadingArchive}
          search={archiveSearch}
          onSearchChange={setArchiveSearch}
          onRestore={handleRestoreCard}
          onDelete={handleDeleteArchivedCard}
          onClose={() => setShowArchiveModal(false)}
        />
      )}

      {/* Modal: Create Card Prompt */}
      {newCardModalColId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal max-w-md w-full p-6 space-y-4 rounded-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <IconPlus className="w-4 h-4 text-[#d2bbff]" />
                Nueva Tarjeta
              </h3>
              <button
                onClick={() => setNewCardModalColId(null)}
                className="text-[#958da1] hover:text-white"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formEl = e.currentTarget;
                const input = formEl.elements.namedItem("cardTitle") as HTMLInputElement;
                if (input?.value.trim()) {
                  handleAddCard(newCardModalColId, input.value.trim());
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-[#ccc3d8] mb-1">
                  Título de la Tarjeta
                </label>
                <input
                  name="cardTitle"
                  type="text"
                  autoFocus
                  required
                  placeholder="Ej. Implementar autenticación JWT..."
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewCardModalColId(null)}
                  className="px-4 py-2 text-xs text-[#ccc3d8] hover:bg-white/5 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-btn px-5 py-2 text-xs font-bold text-white rounded-xl"
                >
                  Crear Tarjeta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Share Board / Role Management (Google Stitch Design) */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal max-w-lg w-full p-6 space-y-5 rounded-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d2bbff]">manage_accounts</span>
                Gestión de Miembros &amp; Roles
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-[#958da1] hover:text-white"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {shareError && (
              <div className="p-3 text-xs rounded-xl bg-red-500/15 border border-red-500/30 text-red-200">
                {shareError}
              </div>
            )}
            {shareSuccess && (
              <div className="p-3 text-xs rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200">
                {shareSuccess}
              </div>
            )}

            {/* Invite Form */}
            <form onSubmit={handleAddMember} className="space-y-3">
              <label className="block text-xs font-semibold uppercase text-[#ccc3d8]">
                Invitar Colaborador por Correo
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="usuario@ejemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="glass-input flex-1 text-xs px-3 py-2 rounded-xl"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="glass-input text-xs px-2.5 py-2 rounded-xl font-semibold cursor-pointer"
                >
                  <option value="EDITOR" className="text-black">Editor (Completo)</option>
                  <option value="VIEWER" className="text-black">Lector (Solo Lectura)</option>
                </select>
                <button
                  type="submit"
                  className="primary-btn px-4 py-2 text-white rounded-xl text-xs font-bold"
                >
                  Añadir
                </button>
              </div>
            </form>

            {/* Members List with Granular Role Indicators */}
            <div className="space-y-2 pt-2 border-t border-[#4a4455]/30">
              <h4 className="text-xs font-bold uppercase text-[#958da1]">Miembros con Acceso</h4>
              <div className="divide-y divide-white/5 max-h-52 overflow-y-auto pr-1">
                {/* Owner */}
                <div className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#7c3aed] text-white font-bold text-xs flex items-center justify-center">
                      {board.owner?.name ? board.owner.name[0] : "P"}
                    </div>
                    <div>
                      <div className="font-bold text-white">
                        {board.owner?.name || board.owner?.email}
                      </div>
                      <div className="text-[10px] text-[#958da1]">{board.owner?.email}</div>
                    </div>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-[#7c3aed]/20 text-[#d2bbff] border border-[#7c3aed]/40 flex items-center gap-1">
                    <span>📌</span>
                    <span>Propietario</span>
                  </span>
                </div>

                {/* Members */}
                {board.members.map((m) => (
                  <div key={m.user.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#4f319c] text-white font-bold text-xs flex items-center justify-center">
                        {m.user.name ? m.user.name[0] : m.user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white">
                          {m.user.name || m.user.email}
                        </div>
                        <div className="text-[10px] text-[#958da1]">{m.user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#2d2739] text-[#ccc3d8] border border-[#4a4455]/40">
                        {m.role === "EDITOR" ? "✏️ Editor" : "👁️ Lector"}
                      </span>
                      {board.accessRole === "OWNER" && (
                        <button
                          onClick={() => handleRemoveMember(m.user.id)}
                          className="text-[#958da1] hover:text-red-400 p-1"
                          title="Quitar acceso"
                        >
                          <IconX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Tablero */}
      {showEditBoardModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal max-w-md w-full p-6 space-y-4 rounded-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d2bbff]">edit</span>
                <span>Editar Tablero</span>
              </h3>
              <button
                onClick={() => setShowEditBoardModal(false)}
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
                    <span>{uploadingBoardCover ? "Subiendo..." : "Subir archivo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadBoardCover}
                      className="hidden"
                      disabled={uploadingBoardCover}
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowEditBoardModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#ccc3d8] hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingBoardEdit || !editBoardTitle.trim()}
                  className="primary-btn px-5 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                >
                  {savingBoardEdit ? "Guardando..." : "Guardar Cambios"}
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

// ----------------- Kanban Column (Stitch Spec) -----------------
function KanbanColumn({
  column,
  iconEmoji,
  cards,
  isReadOnly,
  onAddCard,
  onDeleteColumn,
  cardTitleInput,
  setCardTitleInput,
  onCardClick,
}: {
  column: ColumnItem;
  iconEmoji: string;
  cards: CardItem[];
  isReadOnly: boolean;
  onAddCard: (colId: string) => void;
  onDeleteColumn: (colId: string) => void;
  cardTitleInput: string;
  setCardTitleInput: (val: string) => void;
  onCardClick: (card: CardItem) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);

  return (
    <div
      ref={setNodeRef}
      className="w-[316px] shrink-0 max-h-full flex flex-col rounded-2xl bg-[rgba(18,11,36,0.65)] backdrop-blur-[24px] border border-white/5 shadow-xl shadow-[#100b1c]/50"
    >
      {/* Column Header */}
      <div className="sticky top-0 z-10 px-4 py-3.5 border-b border-[#4a4455]/20 flex items-center justify-between backdrop-blur-xl rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="text-base">{iconEmoji}</span>
          <h3 className="text-sm font-bold text-white tracking-tight">{column.title}</h3>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#2d2739] text-[#ccc3d8]">
            {cards.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {!isReadOnly && (
            <button
              onClick={() => onDeleteColumn(column.id)}
              className="text-[#958da1] hover:text-red-400 p-1 rounded transition-colors"
              title="Eliminar columna"
            >
              <IconTrash className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Cards list */}
      <div className="p-3 overflow-y-auto space-y-3.5 flex-1 min-h-[140px] max-h-[calc(100vh-270px)]">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              isReadOnly={isReadOnly}
              onClick={() => onCardClick(card)}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="h-28 border-2 border-dashed border-[#7c3aed]/25 rounded-xl flex items-center justify-center text-xs text-[#958da1] p-3 text-center">
            Arrastra tarjetas aquí
          </div>
        )}
      </div>

      {/* Add Card Inline Input */}
      {!isReadOnly && (
        <div className="p-3 pt-2 border-t border-[#4a4455]/20">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onAddCard(column.id);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="+ Añadir tarea (Enter)..."
              value={cardTitleInput}
              onChange={(e) => setCardTitleInput(e.target.value)}
              className="glass-input flex-1 text-xs py-1.5 px-3 rounded-xl"
            />
            {cardTitleInput.trim() && (
              <button
                type="submit"
                className="primary-btn p-1.5 rounded-lg text-white"
              >
                <IconPlus className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

// ----------------- Sortable Card (Stitch Spec) -----------------
function SortableCard({
  card,
  isReadOnly,
  onClick,
}: {
  card: CardItem;
  isReadOnly: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: isReadOnly,
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const coverImage = card.images && card.images.length > 0 ? card.images[0].url : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`glass-card p-3.5 rounded-xl cursor-pointer group hover:bg-[rgba(109,40,217,0.32)] transition-all ${
        isDragging ? "opacity-30 border-2 border-[#7c3aed] scale-95 shadow-none" : ""
      }`}
    >
      {/* Top row: first tag + indicator */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex flex-wrap gap-1">
          {card.tags && card.tags.length > 0 ? (
            card.tags.slice(0, 2).map((t) => (
              <span
                key={t.id}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#7c3aed]/25 text-[#d2bbff] border border-[#7c3aed]/40"
              >
                #{t.name}
              </span>
            ))
          ) : (
            <span className="text-[10px] font-mono text-[#958da1]">#tarea</span>
          )}
        </div>

        <span className="text-[11px] text-[#958da1] flex items-center gap-1 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Editor</span>
        </span>
      </div>

      {/* Cover image if available */}
      {coverImage && (
        <div className="mb-2.5 rounded-lg overflow-hidden h-28 w-full bg-[#100b1c] border border-white/10">
          <img src={coverImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Title */}
      <h4 className="text-xs font-semibold text-white line-clamp-2 leading-relaxed">
        {card.title}
      </h4>

      {/* Metadata Footer: Checklists, Images, Links */}
      <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-white/5 text-[11px] text-[#958da1]">
        <div className="flex items-center gap-3">
          {card.description && (
            <span className="flex items-center gap-1 text-[#d2bbff]" title="Tiene descripción">
              <span className="material-symbols-outlined text-xs">notes</span>
              <span>detalles</span>
            </span>
          )}
          {card.images && card.images.length > 0 && (
            <span className="flex items-center gap-1" title={`${card.images.length} imágenes`}>
              <span className="material-symbols-outlined text-xs">image</span>
              <span>{card.images.length}</span>
            </span>
          )}
          {card.links && card.links.length > 0 && (
            <span className="flex items-center gap-1" title={`${card.links.length} enlaces`}>
              <span className="material-symbols-outlined text-xs">link</span>
              <span>{card.links.length}</span>
            </span>
          )}
        </div>

        <span className="text-[10px] font-mono text-[#958da1]">ID-{card.id.slice(-4)}</span>
      </div>
    </div>
  );
}

// ----------------- Drag Overlay Card -----------------
function CardOverlay({ card }: { card: CardItem }) {
  const coverImage = card.images && card.images.length > 0 ? card.images[0].url : null;
  return (
    <div className="glass-modal p-3.5 rounded-xl shadow-2xl rotate-2 scale-105 border-2 border-[#7c3aed] w-72">
      {coverImage && (
        <div className="mb-2 rounded-lg overflow-hidden h-24 w-full">
          <img src={coverImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <h4 className="text-xs font-bold text-white line-clamp-2">
        {card.title}
      </h4>
    </div>
  );
}

// ----------------- Card Detail Modal (Stitch Spec) -----------------
function CardDetailModal({
  card,
  isReadOnly,
  onClose,
  onCardUpdated,
  onCardDeleted,
  onCardArchived,
}: {
  card: CardItem;
  isReadOnly: boolean;
  onClose: () => void;
  onCardUpdated: (updated: CardItem) => void;
  onCardDeleted: (deletedId: string) => void;
  onCardArchived: (archivedId: string) => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [tags, setTags] = useState<string[]>(card.tags.map((t) => t.name));
  const [newTagInput, setNewTagInput] = useState("");

  const [images, setImages] = useState<ImageItem[]>(card.images || []);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [links, setLinks] = useState<LinkItem[]>(card.links || []);
  const [linkUrlInput, setLinkUrlInput] = useState("");
  const [linkTitleInput, setLinkTitleInput] = useState("");

  const [saving, setSaving] = useState(false);

  async function handleArchive() {
    if (isReadOnly || !confirm("¿Archivar esta tarjeta? Podrás consultarla o recuperarla desde el archivo del tablero.")) return;
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      if (res.ok) {
        onCardArchived(card.id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSave() {
    if (isReadOnly || !title.trim()) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description,
          tags,
          images,
          links,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        onCardUpdated(updated);
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isReadOnly || !confirm("¿Eliminar esta tarjeta permanentemente?")) return;
    try {
      const res = await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
      if (res.ok) onCardDeleted(card.id);
    } catch (err) {
      console.error(err);
    }
  }

  function handleAddTag(e: React.KeyboardEvent) {
    if (e.key === "Enter" && newTagInput.trim()) {
      e.preventDefault();
      const clean = newTagInput.trim().replace(/^#/, "");
      if (!tags.includes(clean)) setTags([...tags, clean]);
      setNewTagInput("");
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setImages([...images, { id: `temp_${Date.now()}`, url: data.url, type: "UPLOAD" }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingImage(false);
    }
  }

  function handleAddImageUrl() {
    if (!imageUrlInput.trim()) return;
    setImages([...images, { id: `temp_${Date.now()}`, url: imageUrlInput.trim(), type: "URL" }]);
    setImageUrlInput("");
  }

  function handleAddLink() {
    if (!linkUrlInput.trim()) return;
    setLinks([
      ...links,
      {
        id: `temp_${Date.now()}`,
        url: linkUrlInput.trim(),
        title: linkTitleInput.trim() || linkUrlInput.trim(),
      },
    ]);
    setLinkUrlInput("");
    setLinkTitleInput("");
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-modal max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7 space-y-6 rounded-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <input
            type="text"
            disabled={isReadOnly}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg sm:text-xl font-bold text-white bg-transparent border-b border-transparent focus:border-[#7c3aed] outline-none w-full pb-1 transition-colors"
          />
          <button onClick={onClose} className="text-[#958da1] hover:text-white">
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase text-[#958da1] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-[#d2bbff]">description</span>
            Descripción de la Tarjeta
          </label>
          <textarea
            rows={4}
            disabled={isReadOnly}
            placeholder="Añade especificaciones técnicas, notas de sprint..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="glass-input w-full text-xs p-3 rounded-xl resize-none leading-relaxed"
          />
        </div>

        {/* Hashtags */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase text-[#958da1] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-[#cebdff]">tag</span>
            Hashtags / Etiquetas
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-[#7c3aed]/25 text-[#d2bbff] border border-[#7c3aed]/40 flex items-center gap-1.5"
              >
                #{tag}
                {!isReadOnly && (
                  <button
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                    className="hover:text-red-400"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {!isReadOnly && (
              <input
                type="text"
                placeholder="+ Etiqueta (Enter)"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="glass-input text-xs py-1 px-2.5 rounded-lg w-32"
              />
            )}
          </div>
        </div>

        {/* Images */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase text-[#958da1] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-[#ffafd3]">image</span>
            Imágenes ({images.length})
          </label>

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative group rounded-xl overflow-hidden h-28 bg-[#100b1c] border border-white/10"
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  {!isReadOnly && (
                    <button
                      onClick={() => setImages(images.filter((_, i) => i !== idx))}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <IconX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isReadOnly && (
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <label className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-dashed border-[#7c3aed]/60 hover:bg-[#7c3aed]/20 text-xs font-semibold text-[#d2bbff] cursor-pointer">
                <IconUpload className="w-4 h-4" />
                <span>{uploadingImage ? "Subiendo..." : "Subir Imagen Local"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>

              <div className="flex flex-1 gap-2">
                <input
                  type="url"
                  placeholder="O pegar URL de imagen..."
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="glass-input flex-1 text-xs px-3 py-1.5 rounded-xl"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="secondary-glass-btn px-3 py-1.5 text-xs font-bold text-white rounded-xl"
                >
                  Adjuntar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Links */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase text-[#958da1] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-emerald-400">link</span>
            Enlaces ({links.length})
          </label>

          {links.length > 0 && (
            <div className="space-y-1.5">
              {links.map((link, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs"
                >
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 font-semibold text-[#d2bbff] hover:underline truncate"
                  >
                    <IconExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>{link.title || link.url}</span>
                  </a>
                  {!isReadOnly && (
                    <button
                      onClick={() => setLinks(links.filter((_, i) => i !== idx))}
                      className="text-[#958da1] hover:text-red-400 p-1"
                    >
                      <IconTrash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isReadOnly && (
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="text"
                placeholder="Título del enlace..."
                value={linkTitleInput}
                onChange={(e) => setLinkTitleInput(e.target.value)}
                className="glass-input text-xs sm:w-1/3 px-3 py-1.5 rounded-xl"
              />
              <input
                type="url"
                placeholder="https://..."
                value={linkUrlInput}
                onChange={(e) => setLinkUrlInput(e.target.value)}
                className="glass-input flex-1 text-xs px-3 py-1.5 rounded-xl"
              />
              <button
                type="button"
                onClick={handleAddLink}
                className="primary-btn px-4 py-2 text-xs font-bold text-white rounded-xl"
              >
                Añadir
              </button>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          {!isReadOnly ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleArchive}
                className="text-xs font-semibold text-[#d2bbff] hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7c3aed]/20 hover:bg-[#7c3aed]/35 border border-[#7c3aed]/35 transition-all cursor-pointer"
                title="Archivar tarjeta"
              >
                <span className="material-symbols-outlined text-sm text-[#d2bbff]">archive</span>
                <span>Archivar</span>
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-red-500/10 transition-all cursor-pointer"
              >
                <IconTrash className="w-4 h-4" />
                <span>Eliminar</span>
              </button>
            </div>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#ccc3d8] hover:bg-white/5 rounded-xl"
            >
              Cerrar
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="primary-btn px-5 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------- Archive Modal (Board Archive) -----------------
function ArchiveModal({
  isReadOnly,
  cards,
  loading,
  search,
  onSearchChange,
  onRestore,
  onDelete,
  onClose,
}: {
  isReadOnly: boolean;
  cards: any[];
  loading: boolean;
  search: string;
  onSearchChange: (s: string) => void;
  onRestore: (cardId: string) => void;
  onDelete: (cardId: string) => void;
  onClose: () => void;
}) {
  const filtered = cards.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q)) ||
      c.column?.title?.toLowerCase().includes(q) ||
      c.tags?.some((t: any) => t.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-modal max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col rounded-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#4a4455]/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#d2bbff] text-xl">inventory_2</span>
            <div>
              <h3 className="text-base font-bold text-white">Archivo del Tablero</h3>
              <p className="text-xs text-[#958da1]">
                Tarjetas archivadas • Puedes restaurarlas a su columna en cualquier momento
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#958da1] hover:text-white p-1 cursor-pointer">
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-white/5">
          <input
            type="text"
            placeholder="Buscar tarjetas archivadas por título, descripción, hashtag o columna..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
          />
        </div>

        {/* Cards List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <span className="material-symbols-outlined text-3xl text-[#958da1]">inventory_2</span>
              <p className="text-xs text-[#958da1]">No hay tarjetas archivadas que coincidan</p>
            </div>
          ) : (
            filtered.map((card) => (
              <div
                key={card.id}
                className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-white/10 transition-colors"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#7c3aed]/20 text-[#d2bbff]">
                      Col: {card.column?.title || "Columna"}
                    </span>
                    {card.tags?.map((t: any) => (
                      <span key={t.id} className="text-[10px] font-mono text-[#cebdff]">
                        #{t.name}
                      </span>
                    ))}
                  </div>
                  <h4 className="text-sm font-semibold text-white truncate">{card.title}</h4>
                  {card.description && (
                    <p className="text-xs text-[#958da1] line-clamp-1">{card.description}</p>
                  )}
                </div>

                {!isReadOnly && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onRestore(card.id)}
                      className="secondary-glass-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 hover:text-emerald-200 cursor-pointer"
                      title="Restaurar al tablero"
                    >
                      <span className="material-symbols-outlined text-sm">unarchive</span>
                      <span>Restaurar</span>
                    </button>
                    <button
                      onClick={() => onDelete(card.id)}
                      className="p-2 rounded-xl text-[#958da1] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Eliminar definitivamente"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-[#958da1]">
          <span>{filtered.length} tarjetas archivadas</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
