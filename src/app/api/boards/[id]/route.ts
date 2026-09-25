import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  const board = await prisma.board.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      columns: {
        orderBy: [{ pinned: "desc" }, { order: "asc" }],
        include: {
          cards: {
            where: { archived: false },
            orderBy: { order: "asc" },
            include: {
              tags: true,
              links: true,
              images: true,
            },
          },
        },
      },
    },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  // Count archived cards in this board
  const archivedCount = await prisma.card.count({
    where: {
      column: { boardId: id },
      archived: true,
    },
  });

  // Check access: Owner, Member, or Admin
  const isOwner = board.ownerId === userId;
  const member = board.members.find((m) => m.userId === userId);
  const isAdmin = userRole === "ADMIN";

  if (!isOwner && !member && !isAdmin) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const accessRole = isOwner || isAdmin ? "OWNER" : member?.role || "VIEWER";

  return NextResponse.json({ ...board, accessRole, archivedCount });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;
  const body = await req.json();

  const board = await prisma.board.findUnique({
    where: { id },
    include: { members: true },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const isOwner = board.ownerId === userId;
  const isEditor = board.members.some((m) => m.userId === userId && m.role === "EDITOR");
  const isAdmin = userRole === "ADMIN";

  if (!isOwner && !isEditor && !isAdmin) {
    return NextResponse.json({ error: "Only owners, editors, or admins can edit board settings" }, { status: 403 });
  }

  const updateData: any = {};
  if (body.title !== undefined && body.title.trim()) updateData.title = body.title.trim();
  if (body.description !== undefined) updateData.description = body.description ? body.description.trim() : null;
  if (body.coverImage !== undefined) updateData.coverImage = body.coverImage ? body.coverImage.trim() : null;
  if (body.archived !== undefined) updateData.archived = Boolean(body.archived);

  const updated = await prisma.board.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  const board = await prisma.board.findUnique({ where: { id } });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const isOwner = board.ownerId === userId;
  const isAdmin = userRole === "ADMIN";

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Only the board owner or admin can delete a board" }, { status: 403 });
  }

  await prisma.board.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
