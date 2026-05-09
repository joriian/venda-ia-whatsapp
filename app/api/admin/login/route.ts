import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || "NEXORA_SECRET_2026";

function hashSenha(senha: string) {
  return crypto
    .createHash("sha256")
    .update(String(senha).trim())
    .digest("hex");
}

function gerarAdminToken(admin: any) {
  return jwt.sign(
    {
      id: admin.id,
      nome: admin.nome,
      email: admin.email,
      nivel: admin.nivel,
      tipo: "admin",
    },
    JWT_SECRET,
    {
      expiresIn: "12h",
    }
  );
}

export async function POST(req: Request) {
  try {
    const { email, senha } = await req.json();

    const emailTratado = String(email || "").trim().toLowerCase();
    const senhaTratada = String(senha || "").trim();

    if (!emailTratado || !senhaTratada) {
      return NextResponse.json(
        {
          error: "Email e senha são obrigatórios",
        },
        {
          status: 400,
        }
      );
    }

    const { data: admin, error } = await supabase
      .from("admin_users")
      .select("*")
      .ilike("email", emailTratado)
      .eq("ativo", true)
      .maybeSingle();

    if (error || !admin) {
      return NextResponse.json(
        {
          error: "Email ou senha incorretos",
        },
        {
          status: 401,
        }
      );
    }

    const senhaHash = hashSenha(senhaTratada);
    const senhaBanco = String(admin.senha_hash || "").trim();

    if (senhaBanco !== senhaHash) {
      return NextResponse.json(
        {
          error: "Email ou senha incorretos",
        },
        {
          status: 401,
        }
      );
    }

    const token = gerarAdminToken(admin);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString();

    const { error: updateError } = await supabase
      .from("admin_users")
      .update({
        session_token: token,
        session_expires_at: expiresAt,
      })
      .eq("id", admin.id);

    if (updateError) {
      console.log("ERRO AO SALVAR SESSAO ADMIN:", updateError.message);

      return NextResponse.json(
        {
          error: "Erro ao criar sessão admin",
        },
        {
          status: 500,
        }
      );
    }

    const response = NextResponse.json({
      ok: true,
      token,
      expiresAt,
      admin: {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        nivel: admin.nivel,
      },
    });

    response.cookies.set("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error: any) {
    console.log("ERRO ADMIN LOGIN:", error.message);

    return NextResponse.json(
      {
        error: "Erro ao fazer login",
      },
      {
        status: 500,
      }
    );
  }
}