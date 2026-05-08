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

function gerarChave(clienteServicoId: string, dia: string) {
  return `webhook_falhando_${clienteServicoId}_${dia}`;
}

async function notificacaoJaExiste(chave: string) {
  const { data } = await supabase
    .from("notificacoes_sistema")
    .select("id")
    .eq("chave_unica", chave)
    .maybeSingle();

  return Boolean(data);
}

async function testarWebhook(url: string) {
  const inicio = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sistema-check": "true",
      },
      body: JSON.stringify({
        check: true,
        origem: "venda-ia-whatsapp",
        enviado_em: new Date().toISOString(),
      }),
      signal: controller.signal,
    });

    const texto = await res.text().catch(() => "");

    clearTimeout(timeout);

    return {
      ok: res.ok,
      http_status: res.status,
      tempo_ms: Date.now() - inicio,
      erro: null,
      response_text: texto.slice(0, 500),
    };
  } catch (error: any) {
    clearTimeout(timeout);

    return {
      ok: false,
      http_status: null,
      tempo_ms: Date.now() - inicio,
      erro:
        error?.name === "AbortError"
          ? "Timeout ao testar webhook"
          : error?.message || "Erro desconhecido",
      response_text: null,
    };
  }
}

export async function GET() {
  try {
    const { data: vinculos, error } = await supabase
      .from("cliente_servicos")
      .select(`
        id,
        cliente_id,
        servico_id,
        workflow_id,
        webhook_url,
        instance_name,
        status,
        clientes_ia_whatsapp (
          nome,
          telefone
        ),
        servicos_ia (
          nome
        )
      `)
      .eq("status", "ativo")
      .not("webhook_url", "is", null);

    if (error) {
      throw new Error(error.message);
    }

    const hoje = new Date().toISOString().slice(0, 10);
    const resultados: any[] = [];

    for (const vinculo of vinculos || []) {
      if (!vinculo.webhook_url) continue;

      const resultado = await testarWebhook(vinculo.webhook_url);

      await supabase.from("checks_webhooks").insert({
        servico_id: vinculo.servico_id,
        cliente_id: vinculo.cliente_id,
        cliente_servico_id: vinculo.id,

        webhook_url: vinculo.webhook_url,
        workflow_id: vinculo.workflow_id,
        instance_name: vinculo.instance_name,

        status: resultado.ok ? "online" : "falha",
        http_status: resultado.http_status,
        tempo_ms: resultado.tempo_ms,

        erro: resultado.erro,
        response_text: resultado.response_text,
      });

      resultados.push({
        cliente_servico_id: vinculo.id,
        webhook_url: vinculo.webhook_url,
        ok: resultado.ok,
        http_status: resultado.http_status,
        tempo_ms: resultado.tempo_ms,
      });

      if (resultado.ok) continue;

      const chave = gerarChave(vinculo.id, hoje);
      const existe = await notificacaoJaExiste(chave);

      if (existe) continue;

      const cliente: any = vinculo.clientes_ia_whatsapp;
      const servico: any = vinculo.servicos_ia;

      const titulo = "Webhook falhando";
      const mensagem =
        `Detectamos uma falha no webhook do serviço.\n\n` +
        `Cliente: ${cliente?.nome || "-"}\n` +
        `Serviço: ${servico?.nome || "-"}\n` +
        `Status HTTP: ${resultado.http_status || "-"}\n` +
        `Erro: ${resultado.erro || "Resposta inválida"}\n\n` +
        `Verifique o workflow no n8n.`;

      await criarNotificacao({
        tipo: "webhook_falhando",
        titulo,
        mensagem,
        cliente_id: vinculo.cliente_id,
        cliente_servico_id: vinculo.id,
        nivel: "error",
        metadata: {
          webhook_url: vinculo.webhook_url,
          workflow_id: vinculo.workflow_id,
          http_status: resultado.http_status,
          tempo_ms: resultado.tempo_ms,
          erro: resultado.erro,
        },
        chave_unica: chave,
      } as any);

      if (cliente?.telefone) {
        await enviarWhatsappNotificacao({
          telefone: cliente.telefone,
          mensagem:
            `Olá ${cliente.nome || ""}.\n\n` +
            `Encontramos uma instabilidade na automação do serviço ${servico?.nome || ""}.\n\n` +
            `Nossa equipe já foi notificada para verificar.`,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      total: resultados.length,
      resultados,
    });
  } catch (error: any) {
    console.log(
      "ERRO VERIFICAR WEBHOOKS:",
      error.response?.data || error.message
    );

    return NextResponse.json(
      {
        error: "Erro ao verificar webhooks",
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}