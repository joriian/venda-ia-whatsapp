import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import crypto from "crypto";
import {
  configurarInstanciaCompleta,
  gerarInstanceName,
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
  if (s === "pending" || s === "in_process") return "pending";
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

function somarMeses(dataBase: Date, meses: number) {
  const nova = new Date(dataBase);
  nova.setMonth(nova.getMonth() + Number(meses || 1));
  return nova;
}

function calcularNovaExpiracao(dataAtual: any, meses: number) {
  const agora = new Date();
  const expiraAtual = dataAtual ? new Date(dataAtual) : null;

  const base =
    expiraAtual && expiraAtual > agora
      ? expiraAtual
      : agora;

  return somarMeses(base, meses);
}

function extrairPaymentId(body: any) {
  if (body?.data?.id) {
    return String(body.data.id);
  }

  if (body?.type === "payment" && body?.resource) {
    return String(body.resource)
      .split("/")
      .pop();
  }

  if (body?.topic === "payment" && body?.resource) {
    return String(body.resource)
      .split("/")
      .pop();
  }

  return null;
}

async function buscarPagamentoMercadoPago(
  paymentId: string
) {
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

async function buscarOuCriarCliente(
  payment: MpPayment
) {
  const metadata = payment?.metadata || {};

  const clienteId =
    metadata.cliente_id || null;

  if (clienteId) {
    const { data: cliente } =
      await supabase
        .from("clientes_ia_whatsapp")
        .select("*")
        .eq("id", clienteId)
        .maybeSingle();

    if (cliente) {
      return cliente;
    }
  }

  const email =
    payment?.payer?.email ||
    metadata.email ||
    payment?.additional_info?.payer?.email ||
    null;

  if (email) {
    const { data: clienteEmail } =
      await supabase
        .from("clientes_ia_whatsapp")
        .select("*")
        .ilike("email", email)
        .order("criado_em", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (clienteEmail) {
      return clienteEmail;
    }
  }

  const telefone =
    metadata.telefone ||
    payment?.payer?.phone?.number ||
    payment?.additional_info?.payer?.phone?.number ||
    null;

  if (telefone) {
    const telefoneLimpo = String(
      telefone
    ).replace(/\D/g, "");

    const { data: clienteTelefone } =
      await supabase
        .from("clientes_ia_whatsapp")
        .select("*")
        .ilike(
          "telefone",
          `%${telefoneLimpo}%`
        )
        .order("criado_em", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (clienteTelefone) {
      return clienteTelefone;
    }
  }

  const novoId = crypto.randomUUID();

  const { data: novoCliente, error } =
    await supabase
      .from("clientes_ia_whatsapp")
      .insert({
        id: novoId,

        nome:
          metadata.nome ||
          payment?.payer?.first_name ||
          payment?.additional_info?.payer?.first_name ||
          "Cliente",

        email:
          email ||
          `cliente-${novoId}@sem-email.local`,

        telefone:
          telefone || "Não informado",

        status:
          "aguardando_pagamento",

        plano_id:
          metadata.plano_id || null,

        servico_id:
          metadata.servico_id || null,

        criado_em:
          new Date().toISOString(),
      })
      .select("*")
      .single();

  if (error) {
    throw new Error(
      `Erro ao criar cliente: ${error.message}`
    );
  }

  return novoCliente;
}

async function buscarPlano(
  planoId: string | null
) {
  if (!planoId) return null;

  const { data } = await supabase
    .from("planos")
    .select("*")
    .eq("id", planoId)
    .maybeSingle();

  return data;
}

async function buscarServico(
  servicoId: string | null,
  plano: any
) {
  if (servicoId) {
    const { data } = await supabase
      .from("servicos_ia")
      .select("*")
      .eq("id", servicoId)
      .maybeSingle();

    if (data) return data;
  }

  if (plano?.servico_id) {
    const { data } = await supabase
      .from("servicos_ia")
      .select("*")
      .eq("id", plano.servico_id)
      .maybeSingle();

    if (data) return data;
  }

  const { data: primeiroServico } =
    await supabase
      .from("servicos_ia")
      .select("*")
      .eq("ativo", true)
      .order("ordem", {
        ascending: true,
      })
      .limit(1)
      .maybeSingle();

  return primeiroServico;
}

async function registrarPagamento(
  params: {
    clienteId: string;
    payment: MpPayment;
    planoId: string | null;
    valorOriginal: number;
    descontoValor: number;
    cupomCodigo: string | null;
  }
) {
  const paymentId = String(
    params.payment.id
  );

  const statusMp =
    normalizarStatusPagamento(
      params.payment.status
    );

  const status =
    traduzirStatusPagamento(statusMp);

  const valor = Number(
    params.payment.transaction_amount ||
      params.payment.total_paid_amount ||
      0
  );

  const registro = {
    cliente_id: params.clienteId,
    mercado_pago_id: paymentId,
    payment_id: paymentId,
    status,
    status_mp: statusMp,
    valor,
    plano_id: params.planoId,
    cupom_codigo: params.cupomCodigo,
    desconto_valor:
      params.descontoValor || 0,
    valor_original:
      params.valorOriginal || valor,
    criado_em:
      params.payment.date_approved ||
      params.payment.date_created ||
      new Date().toISOString(),
  };

  const { data: existente } =
    await supabase
      .from("pagamentos_ia_whatsapp")
      .select("id")
      .or(
        `payment_id.eq.${paymentId},mercado_pago_id.eq.${paymentId}`
      )
      .maybeSingle();

  if (existente?.id) {
    const { error } = await supabase
      .from("pagamentos_ia_whatsapp")
      .update(registro)
      .eq("id", existente.id);

    if (error) {
      throw new Error(
        `Erro ao atualizar pagamento: ${error.message}`
      );
    }

    return existente.id;
  }

  const { data, error } =
    await supabase
      .from("pagamentos_ia_whatsapp")
      .insert(registro)
      .select("id")
      .single();

  if (error) {
    throw new Error(
      `Erro ao registrar pagamento: ${error.message}`
    );
  }

  return data.id;
}

async function ativarOuRenovarServico(
  params: {
    cliente: any;
    servico: any;
    plano: any;
    meses: number;
  }
) {
  const {
    cliente,
    servico,
    plano,
  } = params;

  const meses = Number(
    params.meses ||
      plano?.meses ||
      1
  );

  const instanceName =
    gerarInstanceName(
      cliente.id,
      servico.slug ||
        servico.nome ||
        "servico"
    );

  const {
    data: vinculoMesmoPlano,
  } = await supabase
    .from("cliente_servicos")
    .select("*")
    .eq("cliente_id", cliente.id)
    .eq("servico_id", servico.id)
    .eq("plano_id", plano.id)
    .in("status", [
      "ativo",
      "aguardando_pagamento",
      "vencido",
    ])
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  const novaExpiracao =
    calcularNovaExpiracao(
      vinculoMesmoPlano?.data_expiracao ||
        cliente.data_expiracao,
      meses
    );

  const inicio =
    vinculoMesmoPlano?.data_inicio ||
    new Date().toISOString();

  let clienteServicoId =
    vinculoMesmoPlano?.id || null;

  const payloadServico = {
    plano_id: plano.id,
    status: "ativo",
    data_inicio: inicio,
    data_expiracao:
      novaExpiracao.toISOString(),
    workflow_id:
      servico.workflow_id || null,
    webhook_url:
      servico.webhook_url || null,
    instance_name: instanceName,
    evolution_status:
      vinculoMesmoPlano?.evolution_status ||
      "connecting",
    updated_at:
      new Date().toISOString(),
  };

  if (vinculoMesmoPlano?.id) {
    const { error } = await supabase
      .from("cliente_servicos")
      .update(payloadServico)
      .eq("id", vinculoMesmoPlano.id);

    if (error) {
      throw new Error(
        `Erro ao renovar serviço: ${error.message}`
      );
    }
  } else {
    const {
      data: novoVinculo,
      error,
    } = await supabase
      .from("cliente_servicos")
      .insert({
        cliente_id: cliente.id,
        servico_id: servico.id,
        ...payloadServico,
        evolution_configurado: false,
        created_at:
          new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(
        `Erro ao ativar novo plano do serviço: ${error.message}`
      );
    }

    clienteServicoId =
      novoVinculo.id;
  }

  const {
    error: clienteError,
  } = await supabase
    .from("clientes_ia_whatsapp")
    .update({
      plano_id: plano.id,
      servico_id: servico.id,
      status: "ativo",
      data_inicio:
        cliente.data_inicio ||
        inicio,
      data_expiracao:
        novaExpiracao.toISOString(),
    })
    .eq("id", cliente.id);

  if (clienteError) {
    throw new Error(
      `Erro ao atualizar cliente: ${clienteError.message}`
    );
  }

  return {
    novaExpiracao,
    instanceName,
    clienteServicoId,
  };
}

async function marcarAguardandoPagamento(
  clienteId: string,
  servicoId?: string | null
) {
  await supabase
    .from("clientes_ia_whatsapp")
    .update({
      status:
        "aguardando_pagamento",
    })
    .eq("id", clienteId);

  if (servicoId) {
    await supabase
      .from("cliente_servicos")
      .update({
        status:
          "aguardando_pagamento",
        updated_at:
          new Date().toISOString(),
      })
      .eq("cliente_id", clienteId)
      .eq("servico_id", servicoId);
  }
}

function normalizarEventosEvolution(
  servico: any
) {
  const eventos =
    servico?.evolution_events;

  if (
    Array.isArray(eventos) &&
    eventos.length > 0
  ) {
    return eventos.map((e) =>
      String(e).toUpperCase()
    );
  }

  return [
    "MESSAGES_UPSERT",
    "CONNECTION_UPDATE",
  ];
}

async function configurarEvolutionDoServico(
  params: {
    cliente: any;
    servico: any;
    clienteServicoId: string | null;
    instanceName: string;
  }
) {
  const {
    cliente,
    servico,
    clienteServicoId,
    instanceName,
  } = params;

  const webhookUrl =
    servico.webhook_url ||
    process.env
      .DEFAULT_N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      ok: false,
      motivo:
        "Webhook não configurado",
    };
  }

  const configuracao =
    await configurarInstanciaCompleta({
      clienteId: cliente.id,
      servicoSlug:
        servico.slug ||
        servico.nome ||
        "servico",
      webhookUrl,
      events:
        normalizarEventosEvolution(
          servico
        ),
      webhookEnabled:
        servico.evolution_webhook_enabled ??
        true,
      webhookBase64:
        servico.evolution_webhook_base64 ??
        true,
    });

  const finalInstanceName =
    configuracao.instanceName ||
    instanceName;

  await supabase
    .from("cliente_servicos")
    .update({
      workflow_id:
        servico.workflow_id || null,
      webhook_url: webhookUrl,
      instance_name:
        finalInstanceName,
      evolution_configurado: true,
      evolution_configurado_em:
        new Date().toISOString(),
      evolution_status:
        "connecting",
      updated_at:
        new Date().toISOString(),
    })
    .eq("cliente_id", cliente.id)
    .eq("servico_id", servico.id);

  await supabase
    .from("instancias_evolution")
    .upsert(
      {
        cliente_id: cliente.id,
        servico_id: servico.id,
        cliente_servico_id:
          clienteServicoId,
        instance_name:
          finalInstanceName,
        webhook_url: webhookUrl,
        workflow_id:
          servico.workflow_id || null,
        servico_nome:
          servico.nome || null,
        status: "connecting",
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "cliente_id,servico_id",
      }
    );

  return {
    ...configuracao,
    instanceName:
      finalInstanceName,
  };
}

export async function POST(
  req: Request
) {
  try {
    const body = await req.json();

    console.log(
      "WEBHOOK MERCADO PAGO:",
      body
    );

    const paymentId =
      extrairPaymentId(body);

    if (!paymentId) {
      return NextResponse.json({
        ok: true,
        ignorado:
          "Evento sem ID de pagamento",
      });
    }

    const payment =
      await buscarPagamentoMercadoPago(
        paymentId
      );

    const statusPagamento =
      normalizarStatusPagamento(
        payment.status
      );

    const statusPagamentoPt =
      traduzirStatusPagamento(
        statusPagamento
      );

    const metadata =
      payment.metadata || {};

    const cliente =
      await buscarOuCriarCliente(
        payment
      );

    const planoId =
      metadata.plano_id ||
      cliente.plano_id ||
      null;

    const plano =
      await buscarPlano(planoId);

    if (!plano) {
      await registrarPagamento({
        clienteId: cliente.id,
        payment,
        planoId,
        valorOriginal: Number(
          metadata.valor_original ||
            payment.transaction_amount ||
            0
        ),
        descontoValor: Number(
          metadata.desconto_valor ||
            0
        ),
        cupomCodigo:
          metadata.cupom_codigo ||
          null,
      });

      return NextResponse.json({
        ok: true,
        aviso:
          "Pagamento registrado, mas plano não encontrado",
        status:
          statusPagamentoPt,
      });
    }

    const servicoId =
      metadata.servico_id ||
      cliente.servico_id ||
      plano.servico_id ||
      null;

    const servico =
      await buscarServico(
        servicoId,
        plano
      );

    if (!servico) {
      await registrarPagamento({
        clienteId: cliente.id,
        payment,
        planoId: plano.id,
        valorOriginal: Number(
          metadata.valor_original ||
            plano.valor ||
            payment.transaction_amount ||
            0
        ),
        descontoValor: Number(
          metadata.desconto_valor ||
            0
        ),
        cupomCodigo:
          metadata.cupom_codigo ||
          null,
      });

      return NextResponse.json({
        ok: true,
        aviso:
          "Pagamento registrado, mas serviço não encontrado",
        status:
          statusPagamentoPt,
      });
    }

    await registrarPagamento({
      clienteId: cliente.id,
      payment,
      planoId: plano.id,
      valorOriginal: Number(
        metadata.valor_original ||
          plano.valor ||
          payment.transaction_amount ||
          0
      ),
      descontoValor: Number(
        metadata.desconto_valor ||
          0
      ),
      cupomCodigo:
        metadata.cupom_codigo ||
        null,
    });

    if (
      statusPagamento !==
      "approved"
    ) {
      await marcarAguardandoPagamento(
        cliente.id,
        servico.id
      );

      return NextResponse.json({
        ok: true,
        status:
          statusPagamentoPt,
        acao:
          "pagamento_nao_aprovado",
      });
    }

    const ativacao =
      await ativarOuRenovarServico({
        cliente,
        servico,
        plano,
        meses: Number(
          metadata.meses ||
            plano.meses ||
            1
        ),
      });

    let instancia: any = null;

    try {
      instancia =
        await configurarEvolutionDoServico(
          {
            cliente,
            servico,
            clienteServicoId:
              ativacao.clienteServicoId,
            instanceName:
              ativacao.instanceName,
          }
        );
    } catch (error: any) {
      instancia = {
        ok: false,
        erro:
          error.response?.data ||
          error.message,
      };
    }

    if (
      ativacao.clienteServicoId
    ) {
      await notificarPagamentoAprovado(
        {
          cliente_id: cliente.id,
          cliente_servico_id:
            ativacao.clienteServicoId,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      status: "aprovado",
      cliente_id: cliente.id,
      servico_id: servico.id,
      plano_id: plano.id,
      cliente_servico_id:
        ativacao.clienteServicoId,
      instance_name:
        ativacao.instanceName,
      data_expiracao:
        ativacao.novaExpiracao.toISOString(),
      instancia,
    });
  } catch (error: any) {
    console.log(
      "ERRO WEBHOOK MERCADO PAGO:",
      error.response?.data ||
        error.message
    );

    return NextResponse.json(
      {
        error:
          "Erro no webhook Mercado Pago",
        detalhe:
          error.response?.data ||
          error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    rota:
      "webhook mercado pago ativo",
  });
}