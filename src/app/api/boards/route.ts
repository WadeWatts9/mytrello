import { NextResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const boards = await prisma.board.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } }
      ]
    },
    include: {
      members: true,
    }
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

  const board = await prisma.board.create({
    data: {
      title,
      ownerId: userId,
      columns: {
        create: [
          { title: "To Do", order: 0 },
          { title: "In Progress", order: 1 },
          { title: "Done", order: 2 },
        ]
      }
    }
  });

  return NextResponse.json(board);
}
