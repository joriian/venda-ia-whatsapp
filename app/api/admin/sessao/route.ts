import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || "NEXORA_SECRET_2026";

function limparCookie(status = 401, error = "Sessão inválida") {
  const response = NextResponse.json({ error }, { status });

  response.cookies.set("adminToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

function pegarCookie(req: Request, nome: string) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`${nome}=([^;]+)`));
  return match?.[1] || "";
}

export async function POST(req: Request) {
  try {
    let token = "";

    try {
      const body = await req.json();
      token = body?.token || "";
    } catch {
      token = "";
    }

    if (!token) {
      token = pegarCookie(req, "adminToken");
    }

    if (!token) {
      return limparCookie(401, "Sessão inválida");
    }

    try {
      jwt.verify(token, JWT_SECRET);
    } catch {
      return limparCookie(401, "Token inválido");
    }

    const { data: admin } = await supabase
      .from("admin_users")
      .select("*")
      .eq("session_token", token)
      .eq("ativo", true)
      .maybeSingle();

    if (!admin) {
      return limparCookie(401, "Sessão não encontrada");
    }

    const expira = admin.session_expires_at
      ? new Date(admin.session_expires_at)
      : null;

    if (!expira || expira < new Date()) {
      await supabase
        .from("admin_users")
        .update({
          session_token: null,
          session_expires_at: null,
        })
        .eq("id", admin.id);

      return limparCookie(401, "Sessão expirada");
    }

    return NextResponse.json({
      ok: true,
      token,
      expiresAt: admin.session_expires_at,
      admin: {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        nivel: admin.nivel,
      },
    });
  } catch (error: any) {
    console.log("ERRO ADMIN SESSAO:", error.message);

    return limparCookie(500, "Erro ao validar sessão");
  }
}