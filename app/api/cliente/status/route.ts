import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const clienteId = searchParams.get("cliente");

    if (!clienteId) {
      return NextResponse.json(
        { error: "Cliente obrigatório" },
        { status: 400 }
      );
    }

    const { data: cliente, error: clienteError } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .eq("id", clienteId)
      .maybeSingle();

    if (clienteError || !cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    const { data: servicos, error: servicosError } = await supabase
      .from("cliente_servicos")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false });

    if (servicosError) {
      return NextResponse.json(
        { error: servicosError.message },
        { status: 500 }
      );
    }

    const temServicoAtivo = (servicos || []).some(
      (s: any) => String(s.status || "").toLowerCase() === "ativo"
    );

    const statusFinal =
      String(cliente.status || "").toLowerCase() === "ativo" || temServicoAtivo
        ? "ativo"
        : cliente.status || "aguardando_pagamento";

    return NextResponse.json({
      ...cliente,
      status: statusFinal,
      token: cliente.session_token || "",
      cliente_servicos: servicos || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Erro ao consultar status do cliente",
        detalhe: error.message,
      },
      { status: 500 }
    );
  }
}