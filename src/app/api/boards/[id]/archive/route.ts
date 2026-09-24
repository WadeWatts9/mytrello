import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";

// GET /api/boards/[id]/archive - List all archived cards for a board
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  const board = await prisma.board.findUnique({
    where: { id },
    include: { members: true },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const isOwner = board.ownerId === userId;
  const isMember = board.members.some((m) => m.userId === userId);
  const isAdmin = userRole === "ADMIN";

  if (!isOwner && !isMember && !isAdmin) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const archivedCards = await prisma.card.findMany({
    where: {
      column: { boardId: id },
      archived: true,
    },
    include: {
      column: { select: { id: true, title: true } },
      tags: true,
      links: true,
      images: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(archivedCards);
}
