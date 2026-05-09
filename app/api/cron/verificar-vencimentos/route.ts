import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  criarNotificacao,
  enviarWhatsappNotificacao,
} from "@/lib/notificacoes";

import {
  desconectarInstanciaEvolution,
} from "@/lib/evolution-config";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function diferencaDias(data: Date) {
  const agora = new Date();

  const inicioHoje = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate()
  );

  const inicioData = new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate()
  );

  const diff =
    inicioData.getTime() -
    inicioHoje.getTime();

  return Math.ceil(
    diff / (1000 * 60 * 60 * 24)
  );
}

function gerarMensagem(
  params: {
    nome: string;
    servico: string;
    dias: number;
  }
) {
  if (params.dias > 0) {
    return (
      `Olá ${params.nome}.\n\n` +
      `Seu serviço ${params.servico} vence em ${params.dias} dia(s).\n\n` +
      `Renove antecipadamente para evitar bloqueios.`
    );
  }

  if (params.dias === 0) {
    return (
      `Olá ${params.nome}.\n\n` +
      `Seu serviço ${params.servico} vence hoje.\n\n` +
      `Renove para evitar bloqueio da automação.`
    );
  }

  return (
    `Olá ${params.nome}.\n\n` +
    `Seu serviço ${params.servico} foi bloqueado por vencimento.\n\n` +
    `Faça a renovação para reativar.`
  );
}

function gerarTitulo(dias: number) {
  if (dias > 0) {
    return `Plano vence em ${dias} dia(s)`;
  }

  if (dias === 0) {
    return "Plano vence hoje";
  }

  return "Serviço bloqueado";
}

function gerarNivel(dias: number) {
  if (dias < 0) return "error";
  if (dias <= 1) return "warning";

  return "info";
}

function gerarChave(
  clienteServicoId: string,
  dias: number
) {
  return `vencimento_${clienteServicoId}_${dias}`;
}

async function notificacaoExiste(
  chave: string
) {
  const { data } =
    await supabase
      .from(
        "notificacoes_sistema"
      )
      .select("id")
      .eq("chave_unica", chave)
      .maybeSingle();

  return Boolean(data);
}

async function atualizarStatusCliente(
  clienteId: string
) {
  const { data: vinculos } =
    await supabase
      .from("cliente_servicos")
      .select("status")
      .eq("cliente_id", clienteId);

  if (!vinculos || vinculos.length === 0) {
    return;
  }

  const ativos = vinculos.filter(
    (v) => v.status === "ativo"
  ).length;

  const vencidos = vinculos.filter(
    (v) =>
      v.status === "vencido" ||
      v.status === "bloqueado"
  ).length;

  let status = "ativo";

  if (
    ativos > 0 &&
    vencidos > 0
  ) {
    status = "parcial";
  } else if (
    ativos === 0 &&
    vencidos > 0
  ) {
    status = "bloqueado";
  }

  await supabase
    .from(
      "clientes_ia_whatsapp"
    )
    .update({
      status,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", clienteId);
}

async function bloquearServico(
  vinculo: any
) {
  await supabase
    .from("cliente_servicos")
    .update({
      status: "bloqueado",
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", vinculo.id);

  if (vinculo.instance_name) {
    await desconectarInstanciaEvolution(
      vinculo.instance_name
    );

    await supabase
      .from(
        "instancias_evolution"
      )
      .update({
        status:
          "desconectado",
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "instance_name",
        vinculo.instance_name
      );
  }

  await atualizarStatusCliente(
    vinculo.cliente_id
  );
}

export async function GET() {
  try {
    const { data: vinculos, error } =
      await supabase
        .from(
          "cliente_servicos"
        )
        .select(
          `
        *,
        clientes_ia_whatsapp (
          id,
          nome,
          telefone
        ),
        servicos_ia (
          nome
        )
      `
        )
        .in("status", [
          "ativo",
          "vencido",
        ])
        .not(
          "data_expiracao",
          "is",
          null
        );

    if (error) {
      throw new Error(
        error.message
      );
    }

    const processados: any[] =
      [];

    for (const vinculo of vinculos || []) {
      const cliente: any =
        vinculo.clientes_ia_whatsapp;

      const servico: any =
        vinculo.servicos_ia;

      if (!cliente) continue;

      const expiracao =
        new Date(
          vinculo.data_expiracao
        );

      const dias =
        diferencaDias(expiracao);

      const precisaAvisar =
        dias === 7 ||
        dias === 3 ||
        dias === 1 ||
        dias === 0;

      if (
        !precisaAvisar &&
        dias >= 0
      ) {
        continue;
      }

      const chave =
        gerarChave(
          vinculo.id,
          dias
        );

      const existe =
        await notificacaoExiste(
          chave
        );

      if (existe) {
        continue;
      }

      const titulo =
        gerarTitulo(dias);

      const mensagem =
        gerarMensagem({
          nome:
            cliente.nome ||
            "Cliente",
          servico:
            servico?.nome ||
            "Serviço",
          dias,
        });

      await criarNotificacao({
        tipo:
          dias >= 0
            ? "cliente_vencendo"
            : "cliente_bloqueado",

        titulo,
        mensagem,

        cliente_id:
          cliente.id,

        cliente_servico_id:
          vinculo.id,

        nivel:
          gerarNivel(
            dias
          ) as any,

        metadata: {
          dias,
          data_expiracao:
            vinculo.data_expiracao,
        },

        chave_unica:
          chave,
      } as any);

      if (
        cliente.telefone
      ) {
        await enviarWhatsappNotificacao(
          {
            telefone:
              cliente.telefone,
            mensagem,
          }
        );
      }

      if (dias < 0) {
        await bloquearServico(
          vinculo
        );
      }

      processados.push({
        cliente:
          cliente.nome,
        servico:
          servico?.nome,
        dias,
      });
    }

    return NextResponse.json({
      ok: true,
      total:
        processados.length,
      processados,
    });
  } catch (error: any) {
    console.log(
      "ERRO CRON VENCIMENTOS:",
      error?.response
        ?.data ||
        error.message
    );

    return NextResponse.json(
      {
        error:
          "Erro ao verificar vencimentos",
        detalhe:
          error?.response
            ?.data ||
          error.message,
      },
      {
        status: 500,
      }
    );
  }
}