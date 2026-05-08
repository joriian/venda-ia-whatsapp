import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "NEXORA_SECRET_2026";

const ROTAS_CLIENTE = [
  "/cliente",
];

const ROTAS_ADMIN = [
  "/admin",
];

function validarJWT(token: string) {
  try {
    return jwt.verify(
      token,
      JWT_SECRET
    );
  } catch {
    return null;
  }
}

export function middleware(
  req: NextRequest
) {
  const { pathname } =
    req.nextUrl;

  const clienteToken =
    req.cookies.get(
      "clienteToken"
    )?.value || "";

  const adminToken =
    req.cookies.get(
      "adminToken"
    )?.value || "";

  const rotaCliente =
    ROTAS_CLIENTE.some((r) =>
      pathname.startsWith(r)
    );

  const rotaAdmin =
    ROTAS_ADMIN.some((r) =>
      pathname.startsWith(r)
    );

  if (rotaCliente) {
    if (!clienteToken) {
      return NextResponse.redirect(
        new URL(
          "/login",
          req.url
        )
      );
    }

    const jwtValido =
      validarJWT(clienteToken);

    if (!jwtValido) {
      const response =
        NextResponse.redirect(
          new URL(
            "/login",
            req.url
          )
        );

      response.cookies.delete(
        "clienteToken"
      );

      return response;
    }
  }

  if (
    pathname === "/login" &&
    clienteToken
  ) {
    const jwtValido =
      validarJWT(clienteToken);

    if (jwtValido) {
      return NextResponse.redirect(
        new URL(
          "/cliente",
          req.url
        )
      );
    }
  }

  if (
    pathname === "/" &&
    clienteToken
  ) {
    const jwtValido =
      validarJWT(clienteToken);

    if (jwtValido) {
      return NextResponse.redirect(
        new URL(
          "/cliente",
          req.url
        )
      );
    }
  }

  if (
    rotaAdmin &&
    pathname !==
      "/admin/login"
  ) {
    if (!adminToken) {
      return NextResponse.redirect(
        new URL(
          "/admin/login",
          req.url
        )
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/cliente/:path*",
    "/admin/:path*",
  ],
};