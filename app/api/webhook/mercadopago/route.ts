import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import crypto from "crypto";

import {
  configurarInstanciaCompleta,
  gerarInstanceName,
  instanciaExiste,
  reiniciarInstanciaEvolution,
  criarInstanciaEvolution,
} from "@/lib/evolution-config";

import { notificarPagamentoAprovado } from "@/lib/notificacoes";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type MpPayment = any;

function normalizarStatusPagamento(status: string) {
  const s = String(status || "").toLowerCase();

  if (s === "approved") return "approved";
  if (s === "pending") return "pending";
  if (s === "in_process") return "pending";
  if (s === "rejected") return "rejected";
  if (s === "cancelled") return "cancelled";
  if (s === "refunded") return "refunded";

  return s || "pending";
}

function traduzirStatusPagamento(status: string) {
  const s = String(status || "").toLowerCase();

  if (s === "approved") return "aprovado";
  if (s === "pending") return "pendente";
  if (s === "in_process") return "em_processamento";
  if (s === "rejected") return "recusado";
  if (s === "cancelled") return "cancelado";
  if (s === "refunded") return "reembolsado";

  return "pendente";
}

function extrairPaymentId(body: any) {
  if (body?.data?.id) {
    return String(body.data.id);
  }

  if (body?.resource) {
    return String(body.resource)
      .split("/")
      .pop();
  }

  return null;
}

function somarMeses(data: Date, meses: number) {
  const nova = new Date(data);
  nova.setMonth(nova.getMonth() + Number(meses || 1));
  return nova;
}

function calcularNovaExpiracao(dataAtual: any, meses: number) {
  const agora = new Date();

  const base =
    dataAtual && new Date(dataAtual) > agora
      ? new Date(dataAtual)
      : agora;

  return somarMeses(base, meses);
}

async function buscarPagamentoMercadoPago(paymentId: string) {
  const response = await axios.get(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
    }
  );

  return response.data;
}

async function buscarOuCriarCliente(payment: MpPayment) {
  const metadata = payment?.metadata || {};

  if (metadata.cliente_id) {
    const { data } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .eq("id", metadata.cliente_id)
      .maybeSingle();

    if (data) return data;
  }

  const email =
    payment?.payer?.email ||
    metadata.email ||
    null;

  if (email) {
    const { data } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (data) return data;
  }

  const id = crypto.randomUUID();

  const { data, error } = await supabase
    .from("clientes_ia_whatsapp")
    .insert({
      id,
      nome:
        metadata.nome ||
        payment?.payer?.first_name ||
        "Cliente",
      email:
        email ||
        `cliente-${id}@temp.local`,
      telefone:
        metadata.telefone ||
        "Não informado",
      status: "ativo",
      criado_em: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function buscarPlano(planoId: string) {
  const { data } = await supabase
    .from("planos")
    .select("*")
    .eq("id", planoId)
    .maybeSingle();

  return data;
}

async function buscarServico(servicoId: string) {
  const { data } = await supabase
    .from("servicos_ia")
    .select("*")
    .eq("id", servicoId)
    .maybeSingle();

  return data;
}

async function registrarPagamento(params: {
  clienteId: string;
  clienteServicoId?: string | null;
  payment: MpPayment;
  planoId: string;
  servicoId: string;
  metadata: any;
}) {
  const paymentId = String(params.payment.id);

  const statusMp = normalizarStatusPagamento(
    params.payment.status
  );

  const status = traduzirStatusPagamento(statusMp);

  const registro = {
    cliente_id: params.clienteId,
    cliente_servico_id:
      params.clienteServicoId || null,
    mercado_pago_id: paymentId,
    payment_id: paymentId,
    plano_id: params.planoId,
    servico_id: params.servicoId,
    status,
    status_mp: statusMp,
    valor: Number(params.payment.transaction_amount || 0),
    valor_original:
      params.metadata.valor_original || 0,
    desconto_valor:
      params.metadata.desconto_valor || 0,
    credito_proporcional:
      params.metadata.credito_proporcional || 0,
    tipo_movimento:
      params.metadata.tipo_movimento || "nova_contratacao",
    cupom_codigo:
      params.metadata.cupom_codigo || null,
    criado_em:
      params.payment.date_approved ||
      new Date().toISOString(),
  };

  const { data: existente } = await supabase
    .from("pagamentos_ia_whatsapp")
    .select("id,status")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (existente?.id) {
    if (existente.status === "aprovado") {
      return {
        jaProcessado: true,
        id: existente.id,
      };
    }

    await supabase
      .from("pagamentos_ia_whatsapp")
      .update(registro)
      .eq("id", existente.id);

    return {
      jaProcessado: false,
      id: existente.id,
    };
  }

  const { data } = await supabase
    .from("pagamentos_ia_whatsapp")
    .insert(registro)
    .select("id")
    .single();

  return {
    jaProcessado: false,
    id: data?.id,
  };
}

async function ativarServico(params: {
  cliente: any;
  servico: any;
  plano: any;
  metadata: any;
}) {
  const { cliente, servico, plano, metadata } = params;

  let vinculo = null;

  if (metadata.cliente_servico_id) {
    const { data } = await supabase
      .from("cliente_servicos")
      .select("*")
      .eq("id", metadata.cliente_servico_id)
      .maybeSingle();

    vinculo = data;
  }

  if (!vinculo) {
    const { data } = await supabase
      .from("cliente_servicos")
      .select("*")
      .eq("cliente_id", cliente.id)
      .eq("servico_id", servico.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    vinculo = data;
  }

  const instanceName =
    vinculo?.instance_name ||
    gerarInstanceName(
      cliente.id,
      servico.slug || servico.nome || "servico"
    );

  const novaExpiracao = calcularNovaExpiracao(
    vinculo?.data_expiracao,
    Number(metadata.meses || plano.meses || 1)
  );

  const payload = {
    plano_id: plano.id,
    status: "ativo",
    data_inicio:
      vinculo?.data_inicio ||
      new Date().toISOString(),
    data_expiracao: novaExpiracao.toISOString(),
    workflow_id: servico.workflow_id || null,
    webhook_url: servico.webhook_url || null,
    evolution_status: "connecting",
    evolution_configurado: true,
    instance_name: instanceName,
    updated_at: new Date().toISOString(),
  };

  let clienteServicoId = vinculo?.id || null;

  if (vinculo?.id) {
    await supabase
      .from("cliente_servicos")
      .update(payload)
      .eq("id", vinculo.id);

    clienteServicoId = vinculo.id;
  } else {
    const { data } = await supabase
      .from("cliente_servicos")
      .insert({
        cliente_id: cliente.id,
        servico_id: servico.id,
        created_at: new Date().toISOString(),
        ...payload,
      })
      .select("*")
      .single();

    clienteServicoId = data?.id || null;
  }

  return {
    clienteServicoId,
    instanceName,
    novaExpiracao,
    reativado:
      vinculo?.status === "bloqueado" ||
      vinculo?.status === "vencido",
  };
}

function normalizarEventosEvolution(servico: any) {
  if (Array.isArray(servico?.evolution_events)) {
    return servico.evolution_events.map((e: string) =>
      String(e).toUpperCase()
    );
  }

  return [
    "MESSAGES_UPSERT",
    "CONNECTION_UPDATE",
  ];
}

async function garantirEvolution(params: {
  cliente: any;
  servico: any;
  clienteServicoId: string;
  instanceName: string;
}) {
  const {
    cliente,
    servico,
    clienteServicoId,
    instanceName,
  } = params;

  const existe = await instanciaExiste(instanceName);

  if (!existe) {
    await criarInstanciaEvolution(instanceName);
  } else {
    await reiniciarInstanciaEvolution(instanceName);
  }

  const webhookUrl =
    servico.webhook_url ||
    process.env.DEFAULT_N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      ok: false,
      motivo: "Webhook não configurado",
    };
  }

  const config = await configurarInstanciaCompleta({
    clienteId: cliente.id,
    servicoSlug:
      servico.slug || servico.nome,
    webhookUrl,
    events: normalizarEventosEvolution(servico),
    webhookEnabled:
      servico.evolution_webhook_enabled ?? true,
    webhookBase64:
      servico.evolution_webhook_base64 ?? true,
  });

  await supabase
    .from("cliente_servicos")
    .update({
      instance_name: instanceName,
      evolution_status: "connecting",
      evolution_configurado: true,
      evolution_configurado_em:
        new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", clienteServicoId);

  return {
    ok: true,
    instanceName,
    config,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("WEBHOOK MP:", body);

    const paymentId = extrairPaymentId(body);

    if (!paymentId) {
      return NextResponse.json({
        ok: true,
        ignorado: true,
      });
    }

    const payment =
      await buscarPagamentoMercadoPago(paymentId);

    const metadata = payment.metadata || {};

    const statusPagamento =
      normalizarStatusPagamento(payment.status);

    const cliente =
      await buscarOuCriarCliente(payment);

    const plano = await buscarPlano(metadata.plano_id);

    if (!plano) {
      return NextResponse.json(
        {
          error: "Plano não encontrado",
        },
        { status: 404 }
      );
    }

    const servico = await buscarServico(
      metadata.servico_id
    );

    if (!servico) {
      return NextResponse.json(
        {
          error: "Serviço não encontrado",
        },
        { status: 404 }
      );
    }

    const pagamento = await registrarPagamento({
      clienteId: cliente.id,
      clienteServicoId:
        metadata.cliente_servico_id || null,
      payment,
      planoId: plano.id,
      servicoId: servico.id,
      metadata,
    });

    if (pagamento.jaProcessado) {
      return NextResponse.json({
        ok: true,
        duplicado: true,
      });
    }

    if (statusPagamento !== "approved") {
      return NextResponse.json({
        ok: true,
        status:
          traduzirStatusPagamento(statusPagamento),
      });
    }

    const ativacao = await ativarServico({
      cliente,
      servico,
      plano,
      metadata,
    });

    let evolution = null;

    try {
      evolution = await garantirEvolution({
        cliente,
        servico,
        clienteServicoId:
          ativacao.clienteServicoId,
        instanceName:
          ativacao.instanceName,
      });
    } catch (error: any) {
      evolution = {
        ok: false,
        erro:
          error?.response?.data ||
          error.message,
      };
    }

    await supabase
      .from("clientes_ia_whatsapp")
      .update({
        status: "ativo",
        updated_at: new Date().toISOString(),
      })
      .eq("id", cliente.id);

    if (ativacao.clienteServicoId) {
      await notificarPagamentoAprovado({
        cliente_id: cliente.id,
        cliente_servico_id:
          ativacao.clienteServicoId,
      });
    }

    return NextResponse.json({
      ok: true,
      status: "aprovado",
      reativado: ativacao.reativado,
      cliente_id: cliente.id,
      servico_id: servico.id,
      plano_id: plano.id,
      cliente_servico_id:
        ativacao.clienteServicoId,
      instance_name:
        ativacao.instanceName,
      data_expiracao:
        ativacao.novaExpiracao.toISOString(),
      evolution,
    });
  } catch (error: any) {
    console.log(
      "ERRO WEBHOOK MP:",
      error?.response?.data ||
        error?.message ||
        error
    );

    return NextResponse.json(
      {
        error: "Erro no webhook Mercado Pago",
        detalhe:
          error?.response?.data ||
          error?.message ||
          "Erro interno",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    rota: "webhook mercado pago ativo",
  });
}