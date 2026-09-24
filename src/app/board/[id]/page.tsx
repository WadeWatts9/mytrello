"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
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
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
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

  // Unique tags for filter bar
  const allTags = useMemo(() => {
    if (!board) return [];
    const tagSet = new Set<string>();
    board.columns.forEach((col) => {
      col.cards.forEach((c) => {
        c.tags?.forEach((t) => tagSet.add(t.name));
      });
    });
    return Array.from(tagSet);
  }, [board]);

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

  // DnD
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

    let sourceCol: ColumnItem | undefined;
    let targetCol: ColumnItem | undefined;

    board.columns.forEach((col) => {
      if (col.cards.some((c) => c.id === activeId)) sourceCol = col;
      if (col.cards.some((c) => c.id === overId) || col.id === overId) targetCol = col;
    });

    if (!sourceCol || !targetCol || sourceCol === targetCol) return;

    setBoard((prev) => {
      if (!prev) return prev;
      const sCol = prev.columns.find((c) => c.id === sourceCol!.id);
      const tCol = prev.columns.find((c) => c.id === targetCol!.id);
      if (!sCol || !tCol) return prev;

      const cardIndex = sCol.cards.findIndex((c) => c.id === activeId);
      if (cardIndex === -1) return prev;

      const [cardToMove] = sCol.cards.splice(cardIndex, 1);
      cardToMove.columnId = tCol.id;

      const overIndex = tCol.cards.findIndex((c) => c.id === overId);
      if (overIndex >= 0) {
        tCol.cards.splice(overIndex, 0, cardToMove);
      } else {
        tCol.cards.push(cardToMove);
      }

      return { ...prev, columns: [...prev.columns] };
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveCardId(null);
    if (isReadOnly || !board) return;

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    let currentCol: ColumnItem | undefined;
    board.columns.forEach((col) => {
      if (col.cards.some((c) => c.id === activeId)) currentCol = col;
    });

    if (!currentCol) return;

    const oldIndex = currentCol.cards.findIndex((c) => c.id === activeId);
    const newIndex = currentCol.cards.findIndex((c) => c.id === overId);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      setBoard((prev) => {
        if (!prev) return prev;
        const col = prev.columns.find((c) => c.id === currentCol!.id);
        if (!col) return prev;
        col.cards = arrayMove(col.cards, oldIndex, newIndex);
        return { ...prev, columns: [...prev.columns] };
      });
    }

    try {
      await fetch("/api/cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: activeId,
          targetColumnId: currentCol.id,
          newOrder: newIndex >= 0 ? newIndex : 0,
        }),
      });
    } catch (err) {
      console.error(err);
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
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#7c3aed]/20 text-[#d2bbff] border border-[#7c3aed]/40">
                {isReadOnly ? "Modo Lector" : "En Progreso"}
              </span>
            </div>
            <p className="text-xs text-[#958da1] mt-0.5">
              Propietario: {board.owner?.name || board.owner?.email} • Sincronización SQLite continua
            </p>
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

          {/* Hashtag Filters */}
          {allTags.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto max-w-xs md:max-w-md">
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-white/10 text-white hover:bg-white/20"
                >
                  ✕ Todos
                </button>
              )}
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                    selectedTag === tag
                      ? "bg-[#7c3aed] text-white shadow-sm"
                      : "bg-[#7c3aed]/20 text-[#cebdff] border border-[#7c3aed]/30 hover:bg-[#7c3aed]/30"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

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
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-[#7c3aed]/20 text-[#d2bbff] border border-[#7c3aed]/40">
                    👑 Propietario
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
  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);

  return (
    <div className="w-[316px] shrink-0 max-h-full flex flex-col rounded-2xl bg-[rgba(18,11,36,0.65)] backdrop-blur-[24px] border border-white/5 shadow-xl shadow-[#100b1c]/50">
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
      <div className="p-3 overflow-y-auto space-y-3.5 flex-1 max-h-[calc(100vh-270px)]">
        <SortableContext items={cardIds} strategy={horizontalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              isReadOnly={isReadOnly}
              onClick={() => onCardClick(card)}
            />
          ))}
        </SortableContext>
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
}: {
  card: CardItem;
  isReadOnly: boolean;
  onClose: () => void;
  onCardUpdated: (updated: CardItem) => void;
  onCardDeleted: (deletedId: string) => void;
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
            <button
              onClick={handleDelete}
              className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1.5"
            >
              <IconTrash className="w-4 h-4" />
              <span>Eliminar Tarjeta</span>
            </button>
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
