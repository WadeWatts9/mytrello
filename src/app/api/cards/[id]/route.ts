import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

// PUT /api/cards/[id] - Full update of card details
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { title, description, tags, links, images } = await req.json();

  try {
    // Delete existing links and images for this card to replace them cleanly
    if (links !== undefined) {
      await prisma.link.deleteMany({ where: { cardId: id } });
    }
    if (images !== undefined) {
      await prisma.image.deleteMany({ where: { cardId: id } });
    }

    const tagConnectOrCreate = (tags || []).map((t: string) => {
      const cleanTag = t.trim().replace(/^#/, "");
      return {
        where: { name: cleanTag },
        create: { name: cleanTag },
      };
    });

    const updated = await prisma.card.update({
      where: { id },
      data: {
        title: title ? title.trim() : undefined,
        description: description !== undefined ? description : undefined,
        tags: {
          set: [], // clear existing connections
          connectOrCreate: tagConnectOrCreate,
        },
        links: links
          ? {
              create: links.map((l: any) => ({
                url: l.url,
                title: l.title || l.url,
              })),
            }
          : undefined,
        images: images
          ? {
              create: images.map((img: any) => ({
                url: img.url,
                type: img.type || "URL",
              })),
            }
          : undefined,
      },
      include: {
        tags: true,
        links: true,
        images: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update card" }, { status: 500 });
  }
}

// PATCH /api/cards/[id] - Partial update of card (e.g. archive, title, description, columnId)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const updateData: any = {};
  if (body.title !== undefined) updateData.title = body.title.trim();
  if (body.description !== undefined) updateData.description = body.description;
  if (body.columnId !== undefined) updateData.columnId = body.columnId;
  if (body.order !== undefined) updateData.order = body.order;
  if (body.archived !== undefined) updateData.archived = Boolean(body.archived);

  try {
    const updated = await prisma.card.update({
      where: { id },
      data: updateData,
      include: {
        tags: true,
        links: true,
        images: true,
        column: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update card" }, { status: 500 });
  }
}

// DELETE /api/cards/[id] - Delete a card
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.card.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete card" }, { status: 500 });
  }
}
