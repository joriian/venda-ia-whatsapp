import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validarCliente(token: string) {
  const { data: cliente } = await supabase
    .from("clientes_ia_whatsapp")
    .select("*")
    .eq("session_token", token)
    .maybeSingle();

  if (!cliente) return null;

  const expira = cliente.session_expires_at
    ? new Date(cliente.session_expires_at)
    : null;

  if (!expira || expira < new Date()) return null;

  return cliente;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const token = body.token;
    const busca = String(body.busca || "").trim();
    const status = String(body.status || "todos");

    if (!token) {
      return NextResponse.json({ error: "Token obrigatório" }, { status: 401 });
    }

    const cliente = await validarCliente(token);

    if (!cliente) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    let query = supabase
      .from("logs_mensagens")
      .select(`
        *,
        servicos_ia(nome, slug)
      `)
      .eq("cliente_id", cliente.id)
      .order("criado_em", { ascending: false })
      .limit(50);

    if (status === "enviado") {
      query = query.eq("enviado_n8n", true);
    }

    if (status === "erro") {
      query = query.eq("enviado_n8n", false);
    }

    if (busca) {
      query = query.or(
        `instance_name.ilike.%${busca}%,evento.ilike.%${busca}%,remetente.ilike.%${busca}%,nome_remetente.ilike.%${busca}%,mensagem.ilike.%${busca}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          error: "Erro ao buscar logs",
          detalhe: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      logs: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Erro interno",
        detalhe: error.message,
      },
      { status: 500 }
    );
  }
}