import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { clienteId } = await req.json();

    if (!clienteId) {
      return NextResponse.json({ error: "Cliente obrigatório" }, { status: 400 });
    }

    const { data: cliente } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .eq("id", clienteId)
      .single();

    if (!cliente) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const { data: plano } = await supabase
      .from("planos")
      .select("*")
      .eq("id", cliente.plano_id)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      cliente,
      plano,
    });
  } catch (error: any) {
    console.log("ERRO CLIENTE DADOS:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validarSessao(clienteId: string, token: string) {
  if (!clienteId || !token) return false;

  const { data: cliente } = await supabase
    .from("clientes_ia_whatsapp")
    .select("*")
    .eq("id", clienteId)
    .eq("session_token", token)
    .maybeSingle();

  if (!cliente) return false;

  const expira = cliente.session_expires_at
    ? new Date(cliente.session_expires_at)
    : null;

  if (!expira || expira < new Date()) return false;

  return cliente;
}

export async function POST(req: Request) {
  try {
    const { clienteId, token } = await req.json();

    const cliente = await validarSessao(clienteId, token);

    if (!cliente) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    const { data: plano } = await supabase
      .from("planos")
      .select("*")
      .eq("id", cliente.plano_id)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      cliente,
      plano,
    });
  } catch (error: any) {
    console.log("ERRO CLIENTE DADOS:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}