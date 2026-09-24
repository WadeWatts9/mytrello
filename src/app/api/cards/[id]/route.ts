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
