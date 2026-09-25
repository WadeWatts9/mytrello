import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save in persistent volume: /app/data/uploads or local data/uploads
    const uploadDir = process.env.DATA_DIR || (process.env.NODE_ENV === "production" ? "/app/data/uploads" : path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "uploads"));
    await fs.mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name) || ".png";
    const cleanExt = ext.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 5);
    const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${cleanExt}`;
    const filePath = path.join(/*turbopackIgnore: true*/ uploadDir, filename);

    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      url: `/api/uploads/${filename}`,
      name: file.name,
      type: "UPLOAD",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 });
  }
}
