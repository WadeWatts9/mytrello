import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function GET() {
  const adminExists = await prisma.user.count({ where: { role: "ADMIN" } });
  return NextResponse.json({ needsSetup: adminExists === 0 });
}

export async function POST(req: Request) {
  // Only allow this endpoint when no admin exists
  const adminExists = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminExists > 0) {
    return NextResponse.json(
      { error: "Setup already completed. An admin account already exists." },
      { status: 403 }
    );
  }

  const { name, email, password } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email and password are required." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  return NextResponse.json({ success: true, email: admin.email });
}
