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

    const { data, error } = await supabase
      .from("pagamentos_ia_whatsapp")
      .select("*")
      .eq("cliente_id", clienteId);

    if (error) {
      console.log("ERRO BUSCAR PAGAMENTOS:", error);
      return NextResponse.json(
        { error: "Erro ao buscar pagamentos", detalhe: error },
        { status: 500 }
      );
    }

    const pagamentos = (data || []).sort((a: any, b: any) => {
      const dataA = new Date(
        a.created_at || a.criado_em || a.data_criacao || 0
      ).getTime();

      const dataB = new Date(
        b.created_at || b.criado_em || b.data_criacao || 0
      ).getTime();

      return dataB - dataA;
    });

    return NextResponse.json({
      ok: true,
      pagamentos,
      total: pagamentos.length,
    });
  } catch (error: any) {
    console.log("ERRO CLIENTE PAGAMENTOS:", error.message);

    return NextResponse.json(
      {
        error: true,
        detalhe: error.message,
      },
      { status: 500 }
    );
  }
}