import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "NEXORA_SECRET_2026";

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
  return crypto.randomBytes(64).toString("hex");
}

export async function POST(
  req: NextRequest
) {
  try {
    const refreshToken =
      req.cookies.get(
        "clienteRefreshToken"
      )?.value;

    if (!refreshToken) {
      return NextResponse.json(
        {
          error:
            "Refresh token ausente",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: refreshData,
      error,
    } = await supabase
      .from(
        "refresh_tokens_clientes"
      )
      .select("*")
      .eq(
        "refresh_token",
        refreshToken
      )
      .maybeSingle();

    if (error || !refreshData) {
      return NextResponse.json(
        {
          error:
            "Refresh token inválido",
        },
        {
          status: 401,
        }
      );
    }

    const expirado =
      new Date(
        refreshData.expires_at
      ) < new Date();

    if (expirado) {
      return NextResponse.json(
        {
          error:
            "Refresh token expirado",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: cliente,
      error: clienteError,
    } = await supabase
      .from(
        "clientes_ia_whatsapp"
      )
      .select("*")
      .eq(
        "id",
        refreshData.cliente_id
      )
      .maybeSingle();

    if (
      clienteError ||
      !cliente
    ) {
      return NextResponse.json(
        {
          error:
            "Cliente não encontrado",
        },
        {
          status: 401,
        }
      );
    }

    const novoAccessToken =
      gerarAccessToken(cliente);

    const novoRefreshToken =
      gerarRefreshToken();

    const novaExpiracao =
      new Date();

    novaExpiracao.setDate(
      novaExpiracao.getDate() + 30
    );

    await supabase
      .from(
        "refresh_tokens_clientes"
      )
      .delete()
      .eq(
        "refresh_token",
        refreshToken
      );

    await supabase
      .from(
        "refresh_tokens_clientes"
      )
      .insert({
        cliente_id: cliente.id,
        refresh_token:
          novoRefreshToken,
        expires_at:
          novaExpiracao.toISOString(),
      });

    const response =
      NextResponse.json({
        ok: true,
      });

    response.cookies.set(
      "clienteToken",
      novoAccessToken,
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 12,
      }
    );

    response.cookies.set(
      "clienteRefreshToken",
      novoRefreshToken,
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge:
          60 * 60 * 24 * 30,
      }
    );

    return response;
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        error:
          "Erro ao renovar sessão",
      },
      {
        status: 500,
      }
    );
  }
}