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

    const { data: pagamentos, error } = await supabase
      .from("pagamentos_ia_whatsapp")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("ERRO PAGAMENTOS CLIENTE:", error);
      return NextResponse.json({ error: true }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      pagamentos: pagamentos || [],
    });
  } catch (error: any) {
    console.log("ERRO CLIENTE PAGAMENTOS:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}