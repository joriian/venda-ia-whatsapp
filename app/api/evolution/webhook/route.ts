import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import {
  notificarErroN8n,
  notificarInstanciaDesconectada,
} from "@/lib/notificacoes";

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

function pegarQrCode(body: any) {
  return (
    body?.data?.qrcode ||
    body?.data?.qr ||
    body?.qrcode ||
    body?.qr ||
    body?.base64 ||
    body?.data?.base64 ||
    ""
  );
}

function pegarStatus(body: any) {
  return (
    body?.data?.state ||
    body?.data?.status ||
    body?.state ||
    body?.status ||
    body?.connectionStatus ||
    "connecting"
  );
}

function pegarNumero(body: any) {
  return (
    body?.data?.ownerJid ||
    body?.data?.profile?.id ||
    body?.data?.jid ||
    body?.sender ||
    ""
  );
}

function pegarNome(body: any) {
  return (
    body?.data?.profileName ||
    body?.data?.pushName ||
    body?.data?.name ||
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

function statusDesconectado(status: string) {
  const s = String(status || "").toLowerCase();

  return (
    s === "close" ||
    s === "closed" ||
    s === "disconnected" ||
    s === "desconectado" ||
    s === "logout"
  );
}

async function buscarVinculo(instanceName: string) {
  const { data } = await supabase
    .from("instancias_evolution")
    .select(`
      *,
      clientes_ia_whatsapp (
        id,
        nome,
        telefone
      )
    `)
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

async function atualizarStatusBanco(params: {
  vinculo: any;
  instanceName: string;
  status: string;
  qrcode: string;
  numero: string;
  nome: string;
}) {
  const clienteId = params.vinculo?.cliente_id || null;
  const servicoId = params.vinculo?.servico_id || null;
  const clienteServicoId = params.vinculo?.cliente_servico_id || null;

  await supabase.from("evolution_qrcodes").upsert(
    {
      cliente_id: clienteId,
      servico_id: servicoId,
      cliente_servico_id: clienteServicoId,
      instance_name: params.instanceName,
      qrcode: params.qrcode || null,
      status: params.status,
      numero: params.numero || null,
      nome: params.nome || null,
      atualizado_em: new Date().toISOString(),
    },
    {
      onConflict: "instance_name",
    }
  );

  await supabase
    .from("instancias_evolution")
    .update({
      status: params.status,
      updated_at: new Date().toISOString(),
    })
    .eq("instance_name", params.instanceName);

  if (clienteServicoId) {
    await supabase
      .from("cliente_servicos")
      .update({
        evolution_status: params.status,
        evolution_qrcode: params.qrcode || null,
        evolution_numero: params.numero || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clienteServicoId);
  } else if (clienteId && servicoId) {
    await supabase
      .from("cliente_servicos")
      .update({
        evolution_status: params.status,
        evolution_qrcode: params.qrcode || null,
        evolution_numero: params.numero || null,
        updated_at: new Date().toISOString(),
      })
      .eq("cliente_id", clienteId)
      .eq("servico_id", servicoId);
  }
}

async function encaminharParaN8n(webhookUrl: string | null, body: any, vinculo: any) {
  if (!webhookUrl) {
    return {
      enviado: false,
      motivo: "sem webhook_url",
    };
  }

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

    return {
      enviado: true,
    };
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
      return NextResponse.json({
        ok: true,
        ignored: "Evento sem instanceName",
      });
    }

    const vinculo = await buscarVinculo(instanceName);

    const qrcode = pegarQrCode(body);
    const status = pegarStatus(body);
    const numero = pegarNumero(body);
    const nome = pegarNome(body);

    const mensagem = pegarMensagem(body);
    const remetente = pegarRemetente(body);
    const nomeRemetente = pegarNomeRemetente(body);

    await atualizarStatusBanco({
      vinculo,
      instanceName,
      status,
      qrcode,
      numero,
      nome,
    });

    const eventoNormalizado = String(evento || "").toUpperCase();

    let n8n: any = {
      enviado: false,
      motivo: "evento não encaminhado",
    };

    const ehMensagem =
      eventoNormalizado.includes("MESSAGES_UPSERT") ||
      eventoNormalizado.includes("MESSAGE");

    if (ehMensagem) {
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

    if (statusDesconectado(status)) {
      await notificarInstanciaDesconectada({
        cliente_id: vinculo?.cliente_id || null,
        cliente_servico_id: vinculo?.cliente_servico_id || null,
        telefone: vinculo?.clientes_ia_whatsapp?.telefone || null,
        instance_name: instanceName,
      });
    }

    if (ehMensagem && !n8n.enviado) {
      await notificarErroN8n({
        cliente_id: vinculo?.cliente_id || null,
        cliente_servico_id: vinculo?.cliente_servico_id || null,
        telefone: vinculo?.clientes_ia_whatsapp?.telefone || null,
        erro: n8n.erro || n8n.motivo || "Falha ao enviar mensagem para o n8n",
        instance_name: instanceName,
      });
    }

    return NextResponse.json({
      ok: true,
      evento,
      instanceName,
      status,
      n8n,
    });
  } catch (error: any) {
    console.log("ERRO WEBHOOK EVOLUTION:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error: "Erro no webhook Evolution",
        detalhe: error.response?.data || error.message,
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