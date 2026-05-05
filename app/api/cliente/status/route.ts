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

  const { data: cliente, error } = await supabase
    .from("clientes_ia_whatsapp")
    .select("id,status,data_expiracao")
    .eq("id", clienteId)
    .single();

  if (error || !cliente) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  return NextResponse.json(cliente);
}