import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const adminToken = req.cookies.get("adminToken")?.value || "";
  const clienteToken = req.cookies.get("clienteToken")?.value || "";

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!adminToken) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    return NextResponse.next();
  }

  if (pathname === "/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/cliente")) {
    if (!clienteToken) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/cliente/:path*", "/login"],
};