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
          cards: {
            where: { archived: false },
            select: {
              tags: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(boards);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (Array.isArray(body.reorder)) {
    await prisma.$transaction(
      body.reorder.map((item: any, idx: number) =>
        prisma.board.update({
          where: { id: item.id },
          data: { order: item.order !== undefined ? item.order : idx },
        })
      )
    );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { title, description, coverImage } = await req.json();

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "Board title is required" }, { status: 400 });
  }

  const board = await prisma.board.create({
    data: {
      title: title.trim(),
      description: description ? description.trim() : null,
      coverImage: coverImage ? coverImage.trim() : null,
      ownerId: userId,
      columns: {
        create: [
          { title: "Por Hacer", order: 0 },
          { title: "En Progreso", order: 1 },
          { title: "Finalizado", order: 2 },
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
