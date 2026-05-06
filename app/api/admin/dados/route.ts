import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validarAdmin(req: Request) {
  const token = req.headers.get("x-admin-token");

  if (!token) return null;

  const { data: admin } = await supabase
    .from("admin_users")
    .select("*")
    .eq("session_token", token)
    .eq("ativo", true)
    .maybeSingle();

  if (!admin) return null;

  const expira = admin.session_expires_at
    ? new Date(admin.session_expires_at)
    : null;

  if (!expira || expira < new Date()) return null;

  return admin;
}

function temPagamentoAprovado(pagamentos: any[]) {
  return pagamentos.some((p) => {
    const status = String(p.status || "").toLowerCase();

    return (
      status === "approved" ||
      status === "aprovado" ||
      status === "ativo"
    );
  });
}

function estaVencido(dataExpiracao: any) {
  if (!dataExpiracao) return false;
  return new Date(dataExpiracao) < new Date();
}

async function buscarPagamentos(clienteId: string) {
  const { data, error } = await supabase
    .from("pagamentos_ia_whatsapp")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("criado_em", { ascending: false })
    .limit(5);

  if (error) {
    console.log("ERRO BUSCAR PAGAMENTOS ADMIN:", error.message);
    return [];
  }

  return data || [];
}

async function corrigirStatus(cliente: any, servicos: any[], pagamentos: any[]) {
  const aprovado = temPagamentoAprovado(pagamentos);
  const vencido = estaVencido(cliente.data_expiracao);

  let statusCorreto = "aguardando_pagamento";

  if (vencido) statusCorreto = "vencido";
  else if (aprovado) statusCorreto = "ativo";

  if (cliente.status !== statusCorreto) {
    await supabase
      .from("clientes_ia_whatsapp")
      .update({ status: statusCorreto })
      .eq("id", cliente.id);

    cliente.status = statusCorreto;
  }

  const servicosCorrigidos = await Promise.all(
    (servicos || []).map(async (servico: any) => {
      let statusServico = statusCorreto;

      if (servico.id && servico.id !== "principal" && servico.status !== statusServico) {
        await supabase
          .from("cliente_servicos")
          .update({
            status: statusServico,
            updated_at: new Date().toISOString(),
          })
          .eq("id", servico.id);
      }

      return {
        ...servico,
        status: statusServico,
      };
    })
  );

  return {
    cliente,
    servicos: servicosCorrigidos,
  };
}

export async function GET(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: clientes, error } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Erro ao buscar clientes" },
        { status: 500 }
      );
    }

    const clientesCompletos = await Promise.all(
      (clientes || []).map(async (cliente: any) => {
        const { data: servicos } = await supabase
          .from("cliente_servicos")
          .select(`
            *,
            servicos_ia (*),
            planos (*)
          `)
          .eq("cliente_id", cliente.id)
          .order("created_at", { ascending: false });

        let servicosFinal = servicos || [];

        if (servicosFinal.length === 0) {
          let planoInfo: any = null;

          if (cliente.plano_id) {
            const { data: plano } = await supabase
              .from("planos")
              .select("*")
              .eq("id", cliente.plano_id)
              .maybeSingle();

            planoInfo = plano;
          }

          let servicoInfo: any = null;

          if (cliente.servico_id) {
            const { data: servico } = await supabase
              .from("servicos_ia")
              .select("*")
              .eq("id", cliente.servico_id)
              .maybeSingle();

            servicoInfo = servico;
          }

          servicosFinal = [
            {
              id: "principal",
              status: cliente.status || "aguardando_pagamento",
              plano_id: cliente.plano_id,
              data_inicio: cliente.data_inicio,
              data_expiracao: cliente.data_expiracao,
              servicos_ia: servicoInfo || {
                nome: "Serviço principal",
              },
              planos: planoInfo || {
                nome: cliente.plano_id || "Plano",
              },
            },
          ];
        }

        const pagamentos = await buscarPagamentos(cliente.id);
        const corrigido = await corrigirStatus(cliente, servicosFinal, pagamentos);

        return {
          ...corrigido.cliente,
          servicos_cliente: corrigido.servicos,
          pagamentos_cliente: pagamentos,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      clientes: clientesCompletos,
    });
  } catch (error: any) {
    console.log("ERRO ADMIN DADOS:", error.message);

    return NextResponse.json(
      {
        error: "Erro interno",
        detalhe: error.message,
      },
      { status: 500 }
    );
  }
}