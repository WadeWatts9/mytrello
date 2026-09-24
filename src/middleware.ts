import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/login", "/setup", "/api/setup", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths and static files
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logo") ||
    pathname.startsWith("/icon")
  ) {
    return NextResponse.next();
  }

  // Check if setup is needed (no admin exists)
  // We check via internal API to avoid importing prisma in edge runtime
  try {
    const setupCheck = await fetch(new URL("/api/setup", request.url));
    if (setupCheck.ok) {
      const data = await setupCheck.json();
      if (data?.needsSetup) {
        // First launch: redirect everything to /setup
        return NextResponse.redirect(new URL("/setup", request.url));
      }
    }
  } catch (err) {
    console.error("Middleware setup check failed:", err);
  }

  // Require authentication for all other routes
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || "supersecret-jwt-key",
  });

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
