import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROTAS_PROTEGIDAS = [
  "/cliente",
  "/admin",
];

const ROTAS_PUBLICAS = [
  "/login",
  "/",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token =
    req.cookies.get("clienteToken")?.value ||
    req.headers.get("x-cliente-token") ||
    "";

  const adminToken =
    req.cookies.get("adminToken")?.value ||
    "";

  const rotaCliente = ROTAS_PROTEGIDAS.some(
    (rota) => pathname.startsWith(rota)
  );

  const rotaPublica = ROTAS_PUBLICAS.some(
    (rota) =>
      pathname === rota ||
      pathname.startsWith(rota)
  );

  if (
    pathname.startsWith("/admin") &&
    !adminToken
  ) {
    return NextResponse.redirect(
      new URL("/admin/login", req.url)
    );
  }

  if (rotaCliente && !token) {
    return NextResponse.redirect(
      new URL("/login", req.url)
    );
  }

  if (
    pathname === "/login" &&
    token
  ) {
    return NextResponse.redirect(
      new URL("/cliente", req.url)
    );
  }

  if (
    pathname === "/" &&
    token
  ) {
    return NextResponse.redirect(
      new URL("/cliente", req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login/:path*",
    "/cliente/:path*",
    "/admin/:path*",
  ],
};