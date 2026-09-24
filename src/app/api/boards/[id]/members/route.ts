import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";

// POST /api/boards/[id]/members - Add member by email or userId
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: boardId } = await params;
  const currentUserId = (session.user as any).id;
  const currentUserRole = (session.user as any).role;
  const { email, role } = await req.json();

  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  // Only owner or admin can invite/add members
  if (board.ownerId !== currentUserId && currentUserRole !== "ADMIN") {
    return NextResponse.json({ error: "Only the board owner or admin can add members" }, { status: 403 });
  }

  const userToAdd = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!userToAdd) {
    return NextResponse.json({ error: "No user found with this email" }, { status: 404 });
  }

  if (userToAdd.id === board.ownerId) {
    return NextResponse.json({ error: "User is already the owner of this board" }, { status: 400 });
  }

  const member = await prisma.boardMember.upsert({
    where: {
      boardId_userId: {
        boardId,
        userId: userToAdd.id,
      },
    },
    update: {
      role: role === "EDITOR" ? "EDITOR" : "VIEWER",
    },
    create: {
      boardId,
      userId: userToAdd.id,
      role: role === "EDITOR" ? "EDITOR" : "VIEWER",
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(member);
}

// DELETE /api/boards/[id]/members - Remove member from board
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: boardId } = await params;
  const currentUserId = (session.user as any).id;
  const currentUserRole = (session.user as any).role;
  const { userId } = await req.json();

  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  // Allowed if owner, admin, or the member themselves leaving
  const isOwnerOrAdmin = board.ownerId === currentUserId || currentUserRole === "ADMIN";
  const isSelfLeaving = userId === currentUserId;

  if (!isOwnerOrAdmin && !isSelfLeaving) {
    return NextResponse.json({ error: "Not authorized to remove this member" }, { status: 403 });
  }

  await prisma.boardMember.deleteMany({
    where: { boardId, userId },
  });

  return NextResponse.json({ success: true });
}
