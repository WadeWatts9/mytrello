import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  // Admins see all boards; standard users see owned or joined boards
  const whereClause =
    userRole === "ADMIN"
      ? {}
      : {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        };

  const boards = await prisma.board.findMany({
    where: whereClause,
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      columns: {
        select: {
          id: true,
          _count: { select: { cards: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(boards);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { title } = await req.json();

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "Board title is required" }, { status: 400 });
  }

  const board = await prisma.board.create({
    data: {
      title: title.trim(),
      ownerId: userId,
      columns: {
        create: [
          { title: "To Do", order: 0 },
          { title: "In Progress", order: 1 },
          { title: "Done", order: 2 },
        ],
      },
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      columns: true,
      members: true,
    },
  });

  return NextResponse.json(board, { status: 201 });
}
