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
    .update(senha)
    .digest("hex");
}

function gerarJWT(cliente: any) {
  return jwt.sign(
    {
      id: cliente.id,
      nome: cliente.nome,
      email: cliente.email,
      telefone: cliente.telefone,
      status: cliente.status,
      tipo: "cliente",
    },
    JWT_SECRET,
    {
      expiresIn: "12h",
    }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = String(
      body.email || ""
    )
      .trim()
      .toLowerCase();

    const senha = String(
      body.senha || ""
    ).trim();

    if (!email || !senha) {
      return NextResponse.json(
        {
          error:
            "Email e senha são obrigatórios",
        },
        {
          status: 400,
        }
      );
    }

    const { data: cliente, error } =
      await supabase
        .from("clientes_ia_whatsapp")
        .select("*")
        .eq("email", email)
        .maybeSingle();

    if (error) {
      console.log(
        "ERRO BUSCAR CLIENTE:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Erro ao buscar cliente",
        },
        {
          status: 500,
        }
      );
    }

    if (!cliente) {
      return NextResponse.json(
        {
          error:
            "Email ou senha incorretos",
        },
        {
          status: 401,
        }
      );
    }

    const senhaHash =
      hashSenha(senha);

    const senhaBanco =
      cliente.senha_hash ||
      cliente.senha ||
      "";

const senhaValida =
  senhaBanco === senhaHash;

    if (!senhaValida) {
      return NextResponse.json(
        {
          error:
            "Email ou senha incorretos",
        },
        {
          status: 401,
        }
      );
    }

    const token =
      gerarJWT(cliente);

    const expires = new Date();

    expires.setHours(
      expires.getHours() + 12
    );

    await supabase
      .from(
        "clientes_ia_whatsapp"
      )
      .update({
        session_token: token,
        session_expires_at:
          expires.toISOString(),
      })
      .eq("id", cliente.id);

    const response =
      NextResponse.json({
        ok: true,
        token,
        cliente: {
          id: cliente.id,
          nome: cliente.nome,
          email: cliente.email,
          telefone:
            cliente.telefone,
          status:
            cliente.status,
        },
        expiresAt:
          expires.toISOString(),
      });

    response.cookies.set(
      "clienteToken",
      token,
      {
        httpOnly: false,
        secure: true,
        sameSite: "lax",
        path: "/",
        expires,
      }
    );

    return response;
  } catch (error: any) {
    console.log(
      "ERRO LOGIN CLIENTE:",
      error.message
    );

    return NextResponse.json(
      {
        error:
          "Erro ao fazer login",
      },
      {
        status: 500,
      }
    );
  }
}