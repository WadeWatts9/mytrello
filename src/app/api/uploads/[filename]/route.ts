import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

  // Prevent directory traversal
  const safeFilename = path.basename(filename);
  const uploadDir = process.env.DATA_DIR || (process.env.NODE_ENV === "production" ? "/app/data/uploads" : path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "uploads"));
  const filePath = path.join(/*turbopackIgnore: true*/ uploadDir, safeFilename);

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(safeFilename).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new Response(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
