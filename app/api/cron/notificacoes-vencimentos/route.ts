import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  criarNotificacao,
  enviarWhatsappNotificacao,
} from "@/lib/notificacoes";

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

  const diff = inicioData.getTime() - inicioHoje.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function gerarMensagemVencimento(params: {
  nome: string;
  servico: string;
  dias: number;
}) {
  if (params.dias > 0) {
    return `Olá ${params.nome}.\n\nSeu serviço ${params.servico} vence em ${params.dias} dia(s).\n\nRenove antecipadamente para evitar bloqueios na automação.`;
  }

  return `Olá ${params.nome}.\n\nSeu serviço ${params.servico} venceu hoje.\n\nRenove o quanto antes para continuar utilizando a automação.`;
}

function gerarTitulo(dias: number) {
  if (dias > 0) {
    return `Seu plano vence em ${dias} dia(s)`;
  }

  return "Seu plano venceu";
}

function gerarNivel(dias: number) {
  if (dias <= 0) return "error";
  if (dias <= 1) return "warning";

  return "info";
}

function gerarChave(clienteServicoId: string, dias: number) {
  return `vencimento_${clienteServicoId}_${dias}`;
}

async function notificacaoJaExiste(chave: string) {
  const { data } = await supabase
    .from("notificacoes_sistema")
    .select("id")
    .eq("chave_unica", chave)
    .maybeSingle();

  return Boolean(data);
}

async function bloquearServico(vinculoId: string, clienteId: string) {
  await supabase
    .from("cliente_servicos")
    .update({
      status: "bloqueado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", vinculoId);

  await supabase
    .from("clientes_ia_whatsapp")
    .update({
      status: "bloqueado",
    })
    .eq("id", clienteId);
}

export async function GET() {
  try {
    const { data: vinculos, error } = await supabase
      .from("cliente_servicos")
      .select(`
        *,
        clientes_ia_whatsapp (
          id,
          nome,
          telefone,
          status
        ),
        servicos_ia (
          nome
        )
      `)
      .in("status", ["ativo", "vencido"])
      .not("data_expiracao", "is", null);

    if (error) {
      throw new Error(error.message);
    }

    const processados: any[] = [];

    for (const vinculo of vinculos || []) {
      const cliente: any = vinculo.clientes_ia_whatsapp;
      const servico: any = vinculo.servicos_ia;

      if (!cliente) continue;

      const expiracao = new Date(vinculo.data_expiracao);

      const dias = diferencaDias(expiracao);

      const precisaAvisar =
        dias === 7 ||
        dias === 3 ||
        dias === 1 ||
        dias === 0;

      if (!precisaAvisar && dias >= 0) {
        continue;
      }

      const chave = gerarChave(vinculo.id, dias);

      const jaExiste = await notificacaoJaExiste(chave);

      if (jaExiste) {
        continue;
      }

      const titulo = gerarTitulo(dias);

      const mensagem = gerarMensagemVencimento({
        nome: cliente.nome || "Cliente",
        servico: servico?.nome || "Automação",
        dias,
      });

      await criarNotificacao({
        tipo: dias >= 0 ? "cliente_vencendo" : "cliente_bloqueado",
        titulo,
        mensagem,

        cliente_id: cliente.id,
        cliente_servico_id: vinculo.id,

        nivel: gerarNivel(dias) as any,

        metadata: {
          dias,
          data_expiracao: vinculo.data_expiracao,
        },

        chave_unica: chave,
      } as any);

      if (cliente.telefone) {
        await enviarWhatsappNotificacao({
          telefone: cliente.telefone,
          mensagem,
        });
      }

      if (dias < 0) {
        await bloquearServico(vinculo.id, cliente.id);
      }

      processados.push({
        cliente: cliente.nome,
        servico: servico?.nome,
        dias,
      });
    }

    return NextResponse.json({
      ok: true,
      total: processados.length,
      processados,
    });
  } catch (error: any) {
    console.log(
      "ERRO CRON VENCIMENTOS:",
      error.response?.data || error.message
    );

    return NextResponse.json(
      {
        error: "Erro no cron de vencimentos",
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}