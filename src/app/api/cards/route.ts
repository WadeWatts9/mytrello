import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

// POST /api/cards - Create a new card
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { columnId, title, description, tags, links, images } = await req.json();

  if (!columnId || !title || !title.trim()) {
    return NextResponse.json({ error: "Column ID and Title are required" }, { status: 400 });
  }

  const highestCard = await prisma.card.findFirst({
    where: { columnId },
    orderBy: { order: "desc" },
  });

  const nextOrder = highestCard ? highestCard.order + 1 : 0;

  // Handle tags: find or create
  const tagConnectOrCreate = (tags || []).map((t: string) => {
    const cleanTag = t.trim().replace(/^#/, "");
    return {
      where: { name: cleanTag },
      create: { name: cleanTag },
    };
  });

  const card = await prisma.card.create({
    data: {
      title: title.trim(),
      description: description || "",
      order: nextOrder,
      columnId,
      tags: {
        connectOrCreate: tagConnectOrCreate,
      },
      links: {
        create: (links || []).map((l: any) => ({
          url: l.url,
          title: l.title || l.url,
        })),
      },
      images: {
        create: (images || []).map((img: any) => ({
          url: img.url,
          type: img.type || "URL",
        })),
      },
    },
    include: {
      tags: true,
      links: true,
      images: true,
    },
  });

  return NextResponse.json(card, { status: 201 });
}

// PATCH /api/cards - Reorder or move card between columns
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId, targetColumnId, newOrder, archived } = await req.json();

  if (!cardId) {
    return NextResponse.json({ error: "Card ID is required" }, { status: 400 });
  }

  const updateData: any = {};
  if (targetColumnId) updateData.columnId = targetColumnId;
  if (newOrder !== undefined) updateData.order = newOrder;
  if (archived !== undefined) updateData.archived = Boolean(archived);

  const card = await prisma.card.update({
    where: { id: cardId },
    data: updateData,
    include: {
      tags: true,
      links: true,
      images: true,
    },
  });

  return NextResponse.json(card);
}
