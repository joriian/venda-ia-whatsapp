import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validarAdmin(req: Request) {
  const token =
    req.headers.get(
      "x-admin-token"
    );

  if (!token) return null;

  const { data } = await supabase
    .from("admin_users")
    .select("*")
    .eq("session_token", token)
    .eq("ativo", true)
    .maybeSingle();

  return data || null;
}

export async function GET(
  req: Request
) {
  try {
    const admin =
      await validarAdmin(req);

    if (!admin) {
      return NextResponse.json(
        {
          error:
            "Não autorizado",
        },
        { status: 401 }
      );
    }

    const {
      data: pagamentos,
    } = await supabase
      .from(
        "pagamentos_ia_whatsapp"
      )
      .select(
        `
        *,
        clientes_ia_whatsapp (
          nome
        ),
        servicos_ia (
          nome
        ),
        planos (
          nome
        )
      `
      )
      .order("criado_em", {
        ascending: false,
      })
      .limit(100);

    const lista =
      pagamentos || [];

    const aprovados =
      lista.filter(
        (p) =>
          p.status ===
          "aprovado"
      );

    const agora =
      new Date();

    const inicioMes =
      new Date(
        agora.getFullYear(),
        agora.getMonth(),
        1
      );

    const pagamentosMes =
      aprovados.filter((p) => {
        return (
          new Date(
            p.criado_em
          ) >= inicioMes
        );
      });

    const faturamentoTotal =
      aprovados.reduce(
        (acc, item) =>
          acc +
          Number(
            item.valor || 0
          ),
        0
      );

    const faturamentoMes =
      pagamentosMes.reduce(
        (acc, item) =>
          acc +
          Number(
            item.valor || 0
          ),
        0
      );

    const mrr =
      pagamentosMes
        .filter(
          (p) =>
            p.tipo_movimento !==
            "upgrade"
        )
        .reduce(
          (acc, item) =>
            acc +
            Number(
              item.valor || 0
            ),
          0
        );

    const ticketMedio =
      aprovados.length > 0
        ? faturamentoTotal /
          aprovados.length
        : 0;

    const upgrades =
      aprovados.filter(
        (p) =>
          p.tipo_movimento ===
          "troca_plano"
      ).length;

    const renovacoes =
      aprovados.filter(
        (p) =>
          p.tipo_movimento ===
          "renovacao"
      ).length;

    const {
      count:
        clientesAtivos,
    } = await supabase
      .from(
        "clientes_ia_whatsapp"
      )
      .select("*", {
        count: "exact",
        head: true,
      })
      .in("status", [
        "ativo",
        "parcial",
      ]);

    const {
      count:
        clientesBloqueados,
    } = await supabase
      .from(
        "clientes_ia_whatsapp"
      )
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "bloqueado"
      );

    const pagamentosFormatados =
      lista.map((item) => ({
        ...item,

        cliente_nome:
          item
            .clientes_ia_whatsapp
            ?.nome || "-",

        servico_nome:
          item.servicos_ia
            ?.nome || "-",

        plano_nome:
          item.planos?.nome ||
          "-",
      }));

    return NextResponse.json({
      ok: true,

      faturamento_total:
        faturamentoTotal,

      faturamento_mes:
        faturamentoMes,

      mrr,

      ticket_medio:
        ticketMedio,

      upgrades,

      renovacoes,

      clientes_ativos:
        clientesAtivos || 0,

      clientes_bloqueados:
        clientesBloqueados || 0,

      pagamentos:
        pagamentosFormatados,
    });
  } catch (error: any) {
    console.log(
      "ERRO FINANCEIRO:",
      error.message
    );

    return NextResponse.json(
      {
        error:
          "Erro ao carregar financeiro",
      },
      { status: 500 }
    );
  }
}