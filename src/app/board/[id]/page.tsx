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
  IconCheck,
  IconUpload,
  IconExternalLink,
  IconUsers,
  IconCrown,
  IconEye,
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

  // Modals
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);

  // New card inline per column
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

  // All unique tags on the board for quick filtering
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
  async function handleAddCard(columnId: string) {
    const title = newCardTitles[columnId]?.trim();
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

  // Handle delete column
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

      return {
        ...prev,
        columns: [...prev.columns],
      };
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

    // Persist to backend
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

  // Handle Share Board
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
      if (!res.ok) throw new Error(data.error || "Error al invitar");

      setShareSuccess(`Colaborador ${data.user.email} añadido.`);
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

  // Active card for drag overlay
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Cargando tablero...</p>
        </div>
      </div>
    );
  }

  if (!board) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar boardTitle={board.title} boardRole={board.accessRole} />

      {/* Board Controls Bar */}
      <div className="glass-panel mx-4 md:mx-8 my-4 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-white/40 dark:hover:bg-slate-800 transition-colors"
            title="Volver al inicio"
          >
            <IconArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              {board.title}
              {board.accessRole === "VIEWER" && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <IconEye className="w-3.5 h-3.5" />
                  Solo Lectura
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Propietario: {board.owner?.name || board.owner?.email}
            </p>
          </div>
        </div>

        {/* Tags filter & Actions */}
        <div className="flex items-center gap-3">
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs md:max-w-md py-1">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <IconTag className="w-3.5 h-3.5" />
              </span>
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:opacity-80"
                >
                  Todos ✕
                </button>
              )}
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                    selectedTag === tag
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {board.accessRole !== "VIEWER" && (
            <button
              onClick={() => {
                setShareError("");
                setShareSuccess("");
                setShowShareModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold bg-white/40 dark:bg-slate-800/80 hover:bg-white/80 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-sm"
            >
              <IconShare className="w-4 h-4 text-indigo-500" />
              <span>Compartir ({board.members?.length || 0})</span>
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board Container */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto px-4 md:px-8 pb-8">
          <div className="flex items-start gap-5 w-max min-w-full">
            {board.columns.map((column) => {
              const filteredCards = selectedTag
                ? column.cards.filter((c) => c.tags?.some((t) => t.name === selectedTag))
                : column.cards;

              return (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={filteredCards}
                  isReadOnly={isReadOnly}
                  onAddCard={handleAddCard}
                  onDeleteColumn={handleDeleteColumn}
                  cardTitleInput={newCardTitles[column.id] || ""}
                  setCardTitleInput={(val) =>
                    setNewCardTitles((prev) => ({ ...prev, [column.id]: val }))
                  }
                  onCardClick={(card) => setSelectedCard(card)}
                />
              );
            })}

            {/* Add Column Button */}
            {!isReadOnly && (
              <div className="w-72 shrink-0">
                {addingColumn ? (
                  <form
                    onSubmit={handleAddColumn}
                    className="glass-panel p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <input
                      type="text"
                      autoFocus
                      placeholder="Título de la columna..."
                      value={newColumnTitle}
                      onChange={(e) => setNewColumnTitle(e.target.value)}
                      className="glass-input w-full text-sm"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAddingColumn(false);
                          setNewColumnTitle("");
                        }}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                      >
                        Añadir Columna
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setAddingColumn(true)}
                    className="w-full glass-panel py-3.5 px-4 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 flex items-center justify-center gap-2 font-bold text-sm transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
                  >
                    <IconPlus className="w-5 h-5" />
                    <span>Añadir Columna</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Drag Overlay Preview */}
        <DragOverlay>
          {activeCard ? <CardOverlay card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Modal: Card Detail */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          boardId={boardId}
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

      {/* Modal: Share Board */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-modal max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <IconShare className="w-5 h-5 text-indigo-500" />
                Compartir Tablero
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {shareError && (
              <div className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                {shareError}
              </div>
            )}
            {shareSuccess && (
              <div className="p-3 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                {shareSuccess}
              </div>
            )}

            {/* Invite Form */}
            <form onSubmit={handleAddMember} className="space-y-3">
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Invitar Colaborador por Correo
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="colaborador@ejemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="glass-input flex-1 text-sm"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="glass-input text-xs cursor-pointer font-semibold"
                >
                  <option value="EDITOR" className="text-black">Editor (Completo)</option>
                  <option value="VIEWER" className="text-black">Lector (Solo Lectura)</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Añadir
                </button>
              </div>
            </form>

            {/* Members List */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase text-slate-500">Miembros con acceso</h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                {/* Owner */}
                <div className="py-2.5 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-500 text-white font-bold text-xs flex items-center justify-center">
                      {board.owner?.name ? board.owner.name[0] : "P"}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {board.owner?.name || board.owner?.email}
                      </div>
                      <div className="text-[10px] text-slate-400">{board.owner?.email}</div>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    Propietario
                  </span>
                </div>

                {/* Members */}
                {board.members.map((m) => (
                  <div key={m.user.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-700 font-bold text-xs flex items-center justify-center text-slate-700 dark:text-slate-300">
                        {m.user.name ? m.user.name[0] : m.user.email[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {m.user.name || m.user.email}
                        </div>
                        <div className="text-[10px] text-slate-400">{m.user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {m.role === "EDITOR" ? "Editor" : "Lector"}
                      </span>
                      {board.accessRole === "OWNER" && (
                        <button
                          onClick={() => handleRemoveMember(m.user.id)}
                          className="text-slate-400 hover:text-red-500 p-1"
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

// ----------------- Column Component -----------------
function KanbanColumn({
  column,
  cards,
  isReadOnly,
  onAddCard,
  onDeleteColumn,
  cardTitleInput,
  setCardTitleInput,
  onCardClick,
}: {
  column: ColumnItem;
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
    <div className="w-80 shrink-0 glass-panel p-3.5 flex flex-col max-h-[calc(100vh-210px)] rounded-2xl shadow-md border border-white/40 dark:border-white/10">
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 px-1 border-b border-slate-200/50 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 tracking-tight">
            {column.title}
          </h3>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {cards.length}
          </span>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => onDeleteColumn(column.id)}
            className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
            title="Eliminar columna"
          >
            <IconTrash className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Cards list */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2.5 min-h-[60px]">
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

      {/* Add Card Input */}
      {!isReadOnly && (
        <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onAddCard(column.id);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="+ Añadir tarjeta (Enter)..."
              value={cardTitleInput}
              onChange={(e) => setCardTitleInput(e.target.value)}
              className="glass-input flex-1 text-xs py-1.5"
            />
            {cardTitleInput.trim() && (
              <button
                type="submit"
                className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                <IconPlus className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

// ----------------- Sortable Card -----------------
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
      className={`glass-card p-3 rounded-xl cursor-pointer group hover:border-indigo-400 transition-all ${
        isDragging ? "opacity-30 border-2 border-indigo-500 scale-95 shadow-none" : ""
      }`}
    >
      {/* Cover image if available */}
      {coverImage && (
        <div className="mb-2 rounded-lg overflow-hidden h-28 w-full bg-slate-100 dark:bg-slate-800">
          <img src={coverImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Card Title */}
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">
        {card.title}
      </h4>

      {/* Tags Chips */}
      {card.tags && card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {card.tags.map((t) => (
            <span
              key={t.id}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
            >
              #{t.name}
            </span>
          ))}
        </div>
      )}

      {/* Indicators (images, links, description) */}
      <div className="flex items-center gap-3 mt-2.5 text-[11px] text-slate-400">
        {card.description && (
          <span className="flex items-center gap-1" title="Tiene descripción">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            detalles
          </span>
        )}
        {card.images && card.images.length > 0 && (
          <span className="flex items-center gap-1" title={`${card.images.length} imágenes`}>
            <IconImage className="w-3.5 h-3.5" />
            {card.images.length}
          </span>
        )}
        {card.links && card.links.length > 0 && (
          <span className="flex items-center gap-1" title={`${card.links.length} enlaces`}>
            <IconLink className="w-3.5 h-3.5" />
            {card.links.length}
          </span>
        )}
      </div>
    </div>
  );
}

// ----------------- Drag Overlay Card -----------------
function CardOverlay({ card }: { card: CardItem }) {
  const coverImage = card.images && card.images.length > 0 ? card.images[0].url : null;
  return (
    <div className="glass-modal p-3 rounded-xl shadow-2xl rotate-2 scale-105 border-2 border-indigo-500 w-72">
      {coverImage && (
        <div className="mb-2 rounded-lg overflow-hidden h-24 w-full">
          <img src={coverImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">
        {card.title}
      </h4>
    </div>
  );
}

// ----------------- Rich Card Detail Modal -----------------
function CardDetailModal({
  card,
  boardId,
  isReadOnly,
  onClose,
  onCardUpdated,
  onCardDeleted,
}: {
  card: CardItem;
  boardId: string;
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
      if (!tags.includes(clean)) {
        setTags([...tags, clean]);
      }
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
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-modal max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <input
            type="text"
            disabled={isReadOnly}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent focus:border-indigo-500 outline-none w-full pb-1 transition-colors"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase text-slate-500">Descripción</label>
          <textarea
            rows={4}
            disabled={isReadOnly}
            placeholder="Añade una descripción más detallada..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="glass-input w-full text-sm resize-none"
          />
        </div>

        {/* Hashtags / Tags */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5">
            <IconTag className="w-4 h-4 text-indigo-500" />
            Hashtags / Etiquetas
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center gap-1"
              >
                #{tag}
                {!isReadOnly && (
                  <button
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                    className="hover:text-red-500"
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
                className="glass-input text-xs py-1 px-2.5 w-32"
              />
            )}
          </div>
        </div>

        {/* Images */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5">
            <IconImage className="w-4 h-4 text-purple-500" />
            Imágenes ({images.length})
          </label>

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden h-28 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
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
              {/* File upload */}
              <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-indigo-400/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer">
                <IconUpload className="w-4 h-4" />
                <span>{uploadingImage ? "Subiendo..." : "Subir archivo de imagen"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>

              {/* URL attach */}
              <div className="flex flex-1 gap-2">
                <input
                  type="url"
                  placeholder="O pegar URL de imagen..."
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="glass-input flex-1 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                >
                  Adjuntar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Links */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5">
            <IconLink className="w-4 h-4 text-emerald-500" />
            Enlaces Externos ({links.length})
          </label>

          {links.length > 0 && (
            <div className="space-y-1.5">
              {links.map((link, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-white/40 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800 text-xs"
                >
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                  >
                    <IconExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>{link.title || link.url}</span>
                  </a>
                  {!isReadOnly && (
                    <button
                      onClick={() => setLinks(links.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-500 p-1"
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
                placeholder="Título del enlace (opcional)..."
                value={linkTitleInput}
                onChange={(e) => setLinkTitleInput(e.target.value)}
                className="glass-input text-xs sm:w-1/3"
              />
              <input
                type="url"
                placeholder="https://..."
                value={linkUrlInput}
                onChange={(e) => setLinkUrlInput(e.target.value)}
                className="glass-input flex-1 text-xs"
              />
              <button
                type="button"
                onClick={handleAddLink}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Añadir
              </button>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          {!isReadOnly ? (
            <button
              onClick={handleDelete}
              className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1.5"
            >
              <IconTrash className="w-4 h-4" />
              <span>Eliminar Tarjeta</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl"
            >
              Cerrar
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20"
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
