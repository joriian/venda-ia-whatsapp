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
}