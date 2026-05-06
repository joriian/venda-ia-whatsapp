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

    const { data: servicosCliente } = await supabase
      .from("cliente_servicos")
      .select(`
        *,
        servicos_ia (*),
        planos (*)
      `)
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: false });

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