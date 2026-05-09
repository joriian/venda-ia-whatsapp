import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "NEXORA_SECRET_2026";

function hashSenha(senha: string) {
  return crypto
    .createHash("sha256")
    .update(String(senha).trim())
    .digest("hex");
}

function gerarAccessToken(cliente: any) {
  return jwt.sign(
    {
      id: cliente.id,
      nome: cliente.nome,
      email: cliente.email,
      tipo: "cliente",
    },
    JWT_SECRET,
    {
      expiresIn: "12h",
    }
  );
}

function gerarRefreshToken() {
  return crypto
    .randomBytes(64)
    .toString("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const senha = String(body.senha || "").trim();

    if (!email || !senha) {
      return NextResponse.json(
        {
          error: "Email e senha obrigatórios",
        },
        {
          status: 400,
        }
      );
    }

    const { data: cliente, error } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error || !cliente) {
      return NextResponse.json(
        {
          error: "Email ou senha inválidos",
        },
        {
          status: 401,
        }
      );
    }

    const senhaHash = hashSenha(senha);
    const senhaBanco = String(cliente.senha_hash || "").trim();

    if (senhaBanco !== senhaHash) {
      return NextResponse.json(
        {
          error: "Email ou senha inválidos",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken = gerarAccessToken(cliente);
    const refreshToken = gerarRefreshToken();

    const refreshExpires = new Date();
    refreshExpires.setDate(refreshExpires.getDate() + 30);

    const { error: refreshError } = await supabase
      .from("refresh_tokens_clientes")
      .insert({
        cliente_id: cliente.id,
        refresh_token: refreshToken,
        expires_at: refreshExpires.toISOString(),
      });

    if (refreshError) {
      console.log("ERRO REFRESH CLIENTE:", refreshError.message);
    }

    const response = NextResponse.json({
      ok: true,
      token: accessToken,
      refreshToken,
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.email,
      },
    });

    response.cookies.set("clienteToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    response.cookies.set("clienteRefreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        error: "Erro interno no login",
      },
      {
        status: 500,
      }
    );
  }
}