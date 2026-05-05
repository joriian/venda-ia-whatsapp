import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "Sessão inválida" },
        { status: 401 }
      );
    }

    const { data: cliente } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .eq("session_token", token)
      .maybeSingle();

    if (!cliente) {
      return NextResponse.json(
        { error: "Sessão não encontrada" },
        { status: 401 }
      );
    }

    const agora = new Date();
    const expira = cliente.session_expires_at
      ? new Date(cliente.session_expires_at)
      : null;

    if (!expira || expira < agora) {
      return NextResponse.json(
        { error: "Sessão expirada" },
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
    console.log("ERRO SESSAO CLIENTE:", error.message);

    return NextResponse.json(
      { error: "Erro ao validar sessão" },
      { status: 500 }
    );
  }
}