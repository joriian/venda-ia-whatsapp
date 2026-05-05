import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clienteId = searchParams.get("cliente");

  if (!clienteId) {
    return NextResponse.json({ error: "Cliente obrigatório" }, { status: 400 });
  }

  const { data: cliente, error: clienteError } = await supabase
    .from("clientes_ia_whatsapp")
    .select("*")
    .eq("id", clienteId)
    .single();

  if (clienteError || !cliente) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const { data: instancia } = await supabase
    .from("instancias_evolution")
    .select("*")
    .eq("cliente_id", clienteId)
    .maybeSingle();

  return NextResponse.json({
    cliente,
    instancia,
  });
}