import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const senha = req.headers.get("x-admin-password");

  if (senha !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { data: clientes } = await supabase
    .from("clientes_ia_whatsapp")
    .select("*");

  const { data: pagamentos } = await supabase
    .from("pagamentos_ia_whatsapp")
    .select("*");

  const hoje = new Date();

  const ativos = clientes?.filter((c) => c.status === "ativo").length || 0;
  const vencidos = clientes?.filter((c) => c.status === "vencido").length || 0;
  const aguardando =
    clientes?.filter((c) => c.status === "aguardando_pagamento").length || 0;

  const vencendo = clientes?.filter((c) => {
    if (!c.data_expiracao || c.status !== "ativo") return false;

    const exp = new Date(c.data_expiracao);
    const diff = Math.ceil(
      (exp.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );

    return diff <= 3 && diff > 0;
  }).length || 0;

  const receitaTotal =
    pagamentos?.reduce((total, p) => total + Number(p.valor || 0), 0) || 0;

  const receitaMes =
    pagamentos
      ?.filter((p) => {
        const data = new Date(p.created_at || p.criado_em || Date.now());
        return (
          data.getMonth() === hoje.getMonth() &&
          data.getFullYear() === hoje.getFullYear()
        );
      })
      .reduce((total, p) => total + Number(p.valor || 0), 0) || 0;

  return NextResponse.json({
    clientes_total: clientes?.length || 0,
    ativos,
    vencidos,
    aguardando,
    vencendo,
    pagamentos_total: pagamentos?.length || 0,
    receita_total: receitaTotal,
    receita_mes: receitaMes,
  });
}