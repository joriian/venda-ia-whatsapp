import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function pegarEvento(body: any) {
  return body?.event || body?.type || body?.data?.event || "";
}

function pegarInstanceName(body: any) {
  return (
    body?.instance ||
    body?.instanceName ||
    body?.data?.instance ||
    body?.data?.instanceName ||
    body?.body?.instance ||
    ""
  );
}

function pegarMensagem(body: any) {
  return (
    body?.data?.message?.conversation ||
    body?.data?.message?.extendedTextMessage?.text ||
    body?.data?.text ||
    body?.text ||
    ""
  );
}

function pegarRemetente(body: any) {
  return (
    body?.data?.key?.remoteJid ||
    body?.data?.remoteJid ||
    body?.sender ||
    ""
  );
}

function pegarNomeRemetente(body: any) {
  return body?.data?.pushName || body?.data?.senderName || "";
}

async function buscarVinculo(instanceName: string) {
  const { data } = await supabase
    .from("instancias_evolution")
    .select("*")
    .eq("instance_name", instanceName)
    .maybeSingle();

  return data;
}

async function salvarLog(params: any) {
  await supabase.from("logs_mensagens").insert({
    cliente_id: params.vinculo?.cliente_id || null,
    servico_id: params.vinculo?.servico_id || null,
    cliente_servico_id: params.vinculo?.cliente_servico_id || null,
    instance_name: params.instanceName,
    evento: params.evento,
    remetente: params.remetente,
    nome_remetente: params.nomeRemetente,
    mensagem: params.mensagem,
    enviado_n8n: params.enviadoN8n,
    erro_n8n: params.erroN8n || null,
    payload: params.body,
  });
}

async function encaminharParaN8n(webhookUrl: string | null, body: any, vinculo: any) {
  if (!webhookUrl) return { enviado: false, motivo: "sem webhook_url" };

  try {
    await axios.post(webhookUrl, {
      ...body,
      sistema: {
        cliente_id: vinculo?.cliente_id || null,
        servico_id: vinculo?.servico_id || null,
        cliente_servico_id: vinculo?.cliente_servico_id || null,
        instance_name: vinculo?.instance_name || null,
        workflow_id: vinculo?.workflow_id || null,
        servico_nome: vinculo?.servico_nome || null,
      },
    });

    return { enviado: true };
  } catch (error: any) {
    return {
      enviado: false,
      erro: JSON.stringify(error.response?.data || error.message),
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const evento = pegarEvento(body);
    const instanceName = pegarInstanceName(body);

    if (!instanceName) {
      return NextResponse.json({ ok: true, ignored: "sem instanceName" });
    }

    const vinculo = await buscarVinculo(instanceName);
    const mensagem = pegarMensagem(body);
    const remetente = pegarRemetente(body);
    const nomeRemetente = pegarNomeRemetente(body);

    const eventoNormalizado = String(evento || "").toUpperCase();

    let n8n: any = {
      enviado: false,
      motivo: "evento não encaminhado",
    };

    if (
      eventoNormalizado.includes("MESSAGES_UPSERT") ||
      eventoNormalizado.includes("MESSAGE")
    ) {
      n8n = await encaminharParaN8n(vinculo?.webhook_url || null, body, vinculo);
    }

    await salvarLog({
      vinculo,
      instanceName,
      evento,
      remetente,
      nomeRemetente,
      mensagem,
      enviadoN8n: Boolean(n8n.enviado),
      erroN8n: n8n.erro || n8n.motivo || null,
      body,
    });

    return NextResponse.json({
      ok: true,
      evento,
      instanceName,
      n8n,
    });
  } catch (error: any) {
    console.log("ERRO WEBHOOK EVOLUTION:", error.message);

    return NextResponse.json(
      {
        error: "Erro no webhook Evolution",
        detalhe: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "evolution webhook ativo",
  });
}