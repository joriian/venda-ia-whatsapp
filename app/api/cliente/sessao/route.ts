import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "NEXORA_SECRET_2026";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token obrigatório" },
        { status: 401 }
      );
    }

    let decoded: any;

    try {
      decoded = jwt.verify(
        token,
        JWT_SECRET
      );
    } catch {
      return NextResponse.json(
        { error: "Token inválido" },
        { status: 401 }
      );
    }

    const { data: cliente } =
      await supabase
        .from("clientes_ia_whatsapp")
        .select("*")
        .eq("id", decoded.id)
        .maybeSingle();

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      clienteId: cliente.id,
      nome: cliente.nome,
      email: cliente.email,
      status: cliente.status,
    });
  } catch (error: any) {
    console.log(
      "ERRO CLIENTE SESSAO:",
      error.message
    );

    return NextResponse.json(
      {
        error:
          "Erro ao validar sessão",
      },
      {
        status: 500,
      }
    );
  }
}