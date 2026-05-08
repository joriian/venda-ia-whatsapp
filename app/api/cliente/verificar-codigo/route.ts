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
    const codigo = String(body.codigo || "").trim();

    if (!token) {
      return NextResponse.json(
        { error: "Token obrigatório" },
        { status: 401 }
      );
    }

    if (!codigo || codigo.length < 4) {
      return NextResponse.json(
        { error: "Código inválido" },
        { status: 400 }
      );
    }

    const cliente = await validarCliente(token);

    if (!cliente) {
      return NextResponse.json(
        { error: "Sessão inválida" },
        { status: 401 }
      );
    }

    const { data: verificacao } = await supabase
      .from("codigos_verificacao_cliente")
      .select("*")
      .eq("cliente_id", cliente.id)
      .eq("codigo", codigo)
      .eq("usado", false)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!verificacao) {
      return NextResponse.json(
        { error: "Código inválido ou já utilizado." },
        { status: 400 }
      );
    }

    const agora = new Date();
    const expira = new Date(verificacao.expira_em);

    if (expira < agora) {
      return NextResponse.json(
        { error: "Código expirado." },
        { status: 400 }
      );
    }

    if ((verificacao.tentativas || 0) >= 5) {
      return NextResponse.json(
        { error: "Limite de tentativas excedido." },
        { status: 400 }
      );
    }

    await supabase
      .from("codigos_verificacao_cliente")
      .update({
        usado: true,
        usado_em: agora.toISOString(),
        tentativas: (verificacao.tentativas || 0) + 1,
      })
      .eq("id", verificacao.id);

    await supabase
      .from("clientes_ia_whatsapp")
      .update({
        telefone_verificado: true,
        telefone_verificado_em: agora.toISOString(),
      })
      .eq("id", cliente.id);

    return NextResponse.json({
      ok: true,
      message: "Telefone verificado com sucesso.",
    });
  } catch (error: any) {
    console.log(
      "ERRO VERIFICAR CÓDIGO:",
      error.response?.data || error.message
    );

    return NextResponse.json(
      {
        error: "Erro ao verificar código",
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}