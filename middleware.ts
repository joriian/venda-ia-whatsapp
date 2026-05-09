import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // LIBERA LOGIN ADMIN
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // PROTEGE ADMIN
  if (pathname.startsWith("/admin")) {
    const adminToken =
      req.cookies.get("adminToken")?.value || "";

    if (!adminToken) {
      return NextResponse.redirect(
        new URL("/admin/login", req.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};