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
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token obrigatório" }, { status: 401 });
    }

    const cliente = await validarCliente(token);

    if (!cliente) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    let { data: servicosCliente } = await supabase
      .from("cliente_servicos")
      .select(`
        *,
        servicos_ia (*),
        planos (*)
      `)
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: false });

    if ((!servicosCliente || servicosCliente.length === 0) && cliente.servico_id) {
      const { data: servico } = await supabase
        .from("servicos_ia")
        .select("*")
        .eq("id", cliente.servico_id)
        .maybeSingle();

      const { data: plano } = await supabase
        .from("planos")
        .select("*")
        .eq("id", cliente.plano_id)
        .maybeSingle();

      servicosCliente = [
        {
          id: "principal",
          cliente_id: cliente.id,
          servico_id: cliente.servico_id,
          plano_id: cliente.plano_id,
          status: cliente.status,
          data_inicio: cliente.data_inicio,
          data_expiracao: cliente.data_expiracao,
          created_at: cliente.criado_em || cliente.created_at,
          servicos_ia: servico,
          planos: plano,
        },
      ];
    }

    const { data: pagamentos } = await supabase
      .from("pagamentos_ia_whatsapp")
      .select("*")
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: false });

    const { data: catalogo } = await supabase
      .from("servicos_ia")
      .select(`
        *,
        planos (*)
      `)
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    const { data: instancia } = await supabase
      .from("instancias_evolution")
      .select("*")
      .eq("cliente_id", cliente.id)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      cliente,
      servicosCliente: servicosCliente || [],
      pagamentos: pagamentos || [],
      catalogo: catalogo || [],
      instancia,
    });
  } catch (error: any) {
    console.log("ERRO CLIENTE DADOS:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}