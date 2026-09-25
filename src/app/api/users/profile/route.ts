import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import bcrypt from "bcrypt";

// GET /api/users/profile - Get current user profile details & statistics
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            ownedBoards: true,
            memberships: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch profile" }, { status: 500 });
  }
}

// PATCH /api/users/profile - Update current user's profile
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const { name, avatar, currentPassword, newPassword } = await req.json();

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (avatar !== undefined) {
      updateData.avatar = avatar && String(avatar).trim().length > 0 ? String(avatar).trim() : null;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "La nueva contraseña debe tener al menos 6 caracteres" },
          { status: 400 }
        );
      }

      if (currentPassword) {
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return NextResponse.json(
            { error: "La contraseña actual es incorrecta" },
            { status: 400 }
          );
        }
      }

      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
  }
}
