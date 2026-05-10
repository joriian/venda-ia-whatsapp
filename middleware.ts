import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  const adminToken =
    req.cookies.get("adminToken")?.value || "";

  const clienteToken =
    req.cookies.get("clienteToken")?.value || "";

  const tokenViaUrl =
    searchParams.get("token");

  /*
   LOGIN ADMIN
  */

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  /*
   ÁREA ADMIN
  */

  if (pathname.startsWith("/admin")) {
    if (!adminToken) {
      return NextResponse.redirect(
        new URL("/admin/login", req.url)
      );
    }

    return NextResponse.next();
  }

  /*
   LOGIN CLIENTE
  */

  if (pathname === "/login") {
    return NextResponse.next();
  }

  /*
   ÁREA CLIENTE
  */

  if (pathname.startsWith("/cliente")) {
    /*
      PERMITE ACESSO SE O TOKEN
      VIER PELA URL
    */

    if (tokenViaUrl) {
      return NextResponse.next();
    }

    /*
      SENÃO EXIGE COOKIE
    */

    if (!clienteToken) {
      return NextResponse.redirect(
        new URL("/login", req.url)
      );
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/cliente/:path*",
    "/login",
  ],
};