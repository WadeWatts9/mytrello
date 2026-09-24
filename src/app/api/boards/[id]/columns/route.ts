import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";

async function verifyBoardEditor(boardId: string, userId: string, userRole: string) {
  if (userRole === "ADMIN") return true;
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { members: true },
  });
  if (!board) return false;
  if (board.ownerId === userId) return true;
  return board.members.some((m) => m.userId === userId && m.role === "EDITOR");
}

// POST /api/boards/[id]/columns - Create column
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: boardId } = await params;
  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  const canEdit = await verifyBoardEditor(boardId, userId, userRole);
  if (!canEdit) return NextResponse.json({ error: "Editor permission required" }, { status: 403 });

  const { title } = await req.json();
  if (!title || !title.trim()) {
    return NextResponse.json({ error: "Column title is required" }, { status: 400 });
  }

  const highestOrderCol = await prisma.column.findFirst({
    where: { boardId },
    orderBy: { order: "desc" },
  });

  const nextOrder = highestOrderCol ? highestOrderCol.order + 1 : 0;

  const newColumn = await prisma.column.create({
    data: {
      title: title.trim(),
      order: nextOrder,
      boardId,
    },
    include: {
      cards: true,
    },
  });

  return NextResponse.json(newColumn, { status: 201 });
}

// PATCH /api/boards/[id]/columns - Update column (rename or reorder)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: boardId } = await params;
  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  const canEdit = await verifyBoardEditor(boardId, userId, userRole);
  if (!canEdit) return NextResponse.json({ error: "Editor permission required" }, { status: 403 });

  const { columnId, title, order } = await req.json();

  const updateData: any = {};
  if (title !== undefined) updateData.title = title.trim();
  if (order !== undefined) updateData.order = order;

  const updated = await prisma.column.update({
    where: { id: columnId },
    data: updateData,
  });

  return NextResponse.json(updated);
}

// DELETE /api/boards/[id]/columns - Delete column and its cards
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: boardId } = await params;
  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  const canEdit = await verifyBoardEditor(boardId, userId, userRole);
  if (!canEdit) return NextResponse.json({ error: "Editor permission required" }, { status: 403 });

  const { columnId } = await req.json();

  await prisma.column.delete({ where: { id: columnId } });

  return NextResponse.json({ success: true });
}
