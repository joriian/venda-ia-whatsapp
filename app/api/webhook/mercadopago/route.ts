import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type MpPayment = any;

function gerarInstanceName(clienteId: string) {
  return `cliente_${clienteId}`.replace(/-/g, "");
}

function normalizarStatusPagamento(status: string) {
  const s = String(status || "").toLowerCase();

  if (s === "approved") return "approved";
  if (s === "pending" || s === "in_process") return "pending";
  if (s === "rejected" || s === "cancelled" || s === "refunded") return "rejected";

  return s || "pending";
}

function somarMeses(dataBase: Date, meses: number) {
  const nova = new Date(dataBase);
  nova.setMonth(nova.getMonth() + Number(meses || 1));
  return nova;
}

function calcularNovaExpiracao(dataAtual: any, meses: number) {
  const agora = new Date();
  const expiraAtual = dataAtual ? new Date(dataAtual) : null;
  const base = expiraAtual && expiraAtual > agora ? expiraAtual : agora;
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

function extrairPaymentId(body: any) {
  const dataId = body?.data?.id;

  if (dataId) return String(dataId);

  if (body?.type === "payment" && body?.resource) {
    return String(body.resource).split("/").pop();
  }

  if (body?.topic === "payment" && body?.resource) {
    return String(body.resource).split("/").pop();
  }

  return null;
}

async function buscarOuCriarCliente(payment: MpPayment) {
  const metadata = payment?.metadata || {};
  const clienteId = metadata.cliente_id;

  if (clienteId) {
    const { data: cliente } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .eq("id", clienteId)
      .maybeSingle();

    if (cliente) return cliente;
  }

  const email =
    payment?.payer?.email ||
    metadata.email ||
    payment?.additional_info?.payer?.email ||
    null;

  if (email) {
    const { data: clientePorEmail } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (clientePorEmail) return clientePorEmail;
  }

  const novoId = crypto.randomUUID();
  const nome =
    metadata.nome ||
    payment?.payer?.first_name ||
    payment?.additional_info?.payer?.first_name ||
    "Cliente";

  const telefone = metadata.telefone || null;

  const { data: novoCliente, error } = await supabase
    .from("clientes_ia_whatsapp")
    .insert({
      id: novoId,
      nome,
      email: email || `cliente-${novoId}@sem-email.local`,
      telefone,
      status: "aguardando_pagamento",
      plano_id: metadata.plano_id || null,
      servico_id: metadata.servico_id || null,
      criado_em: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw new Error(`Erro ao criar cliente: ${error.message}`);

  return novoCliente;
}

async function buscarPlano(planoId: string | null) {
  if (!planoId) return null;

  const { data } = await supabase
    .from("planos")
    .select("*")
    .eq("id", planoId)
    .maybeSingle();

  return data;
}

async function buscarServico(servicoId: string | null, plano: any) {
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

  const { data: primeiroServico } = await supabase
    .from("servicos_ia")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();

  return primeiroServico;
}

async function registrarPagamento(params: {
  clienteId: string;
  payment: MpPayment;
  planoId: string | null;
  valorOriginal: number;
  descontoValor: number;
  cupomCodigo: string | null;
}) {
  const paymentId = String(params.payment.id);
  const status = normalizarStatusPagamento(params.payment.status);
  const valor = Number(params.payment.transaction_amount || params.payment.total_paid_amount || 0);

  const registro = {
    cliente_id: params.clienteId,
    mercado_pago_id: paymentId,
    payment_id: paymentId,
    status,
    valor,
    plano_id: params.planoId,
    cupom_codigo: params.cupomCodigo,
    desconto_valor: params.descontoValor || 0,
    valor_original: params.valorOriginal || valor,
    criado_em: params.payment.date_approved || params.payment.date_created || new Date().toISOString(),
  };

  const { data: existente } = await supabase
    .from("pagamentos_ia_whatsapp")
    .select("id")
    .or(`payment_id.eq.${paymentId},mercado_pago_id.eq.${paymentId}`)
    .maybeSingle();

  if (existente?.id) {
    const { error } = await supabase
      .from("pagamentos_ia_whatsapp")
      .update(registro)
      .eq("id", existente.id);

    if (error) throw new Error(`Erro ao atualizar pagamento: ${error.message}`);
    return existente.id;
  }

  const { data, error } = await supabase
    .from("pagamentos_ia_whatsapp")
    .insert(registro)
    .select("id")
    .single();

  if (error) throw new Error(`Erro ao registrar pagamento: ${error.message}`);

  return data.id;
}

async function ativarOuRenovarServico(params: {
  cliente: any;
  servico: any;
  plano: any;
  meses: number;
}) {
  const cliente = params.cliente;
  const servico = params.servico;
  const plano = params.plano;
  const meses = Number(params.meses || plano?.meses || 1);

  const { data: vinculoExistente } = await supabase
    .from("cliente_servicos")
    .select("*")
    .eq("cliente_id", cliente.id)
    .eq("servico_id", servico.id)
    .maybeSingle();

  const novaExpiracao = calcularNovaExpiracao(
    vinculoExistente?.data_expiracao || cliente.data_expiracao,
    meses
  );

  const inicio = vinculoExistente?.data_inicio || new Date().toISOString();

  if (vinculoExistente?.id) {
    const { error } = await supabase
      .from("cliente_servicos")
      .update({
        plano_id: plano.id,
        status: "ativo",
        data_inicio: inicio,
        data_expiracao: novaExpiracao.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", vinculoExistente.id);

    if (error) throw new Error(`Erro ao renovar serviço: ${error.message}`);
  } else {
    const { error } = await supabase.from("cliente_servicos").insert({
      cliente_id: cliente.id,
      servico_id: servico.id,
      plano_id: plano.id,
      status: "ativo",
      data_inicio: inicio,
      data_expiracao: novaExpiracao.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) throw new Error(`Erro ao ativar serviço: ${error.message}`);
  }

  const { error: clienteError } = await supabase
    .from("clientes_ia_whatsapp")
    .update({
      plano_id: plano.id,
      servico_id: servico.id,
      status: "ativo",
      data_inicio: cliente.data_inicio || inicio,
      data_expiracao: novaExpiracao.toISOString(),
    })
    .eq("id", cliente.id);

  if (clienteError) {
    throw new Error(`Erro ao atualizar cliente: ${clienteError.message}`);
  }

  return novaExpiracao;
}

async function marcarAguardandoPagamento(clienteId: string, servicoId?: string | null) {
  await supabase
    .from("clientes_ia_whatsapp")
    .update({ status: "aguardando_pagamento" })
    .eq("id", clienteId);

  if (servicoId) {
    await supabase
      .from("cliente_servicos")
      .update({
        status: "aguardando_pagamento",
        updated_at: new Date().toISOString(),
      })
      .eq("cliente_id", clienteId)
      .eq("servico_id", servicoId);
  }
}

async function criarOuGarantirInstancia(clienteId: string) {
  if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
    return { ok: false, motivo: "Evolution API não configurada" };
  }

  const instanceName = gerarInstanceName(clienteId);

  try {
    const lista = await axios.get(
      `${process.env.EVOLUTION_API_URL}/instance/fetchInstances`,
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY,
        },
      }
    );

    const instancias = Array.isArray(lista.data)
      ? lista.data
      : lista.data?.instances || [];

    const existe = instancias.some((item: any) => {
      const nome =
        item?.instanceName ||
        item?.instance?.instanceName ||
        item?.name ||
        item?.instance;

      return nome === instanceName;
    });

    if (existe) {
      return { ok: true, instanceName, jaExistia: true };
    }
  } catch (error: any) {
    console.log("ERRO LISTAR INSTANCIAS EVOLUTION:", error.response?.data || error.message);
  }

  try {
    await axios.post(
      `${process.env.EVOLUTION_API_URL}/instance/create`,
      {
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
      },
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    await supabase.from("instancias_evolution").upsert(
      {
        cliente_id: clienteId,
        instance_name: instanceName,
        status: "qrcode",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cliente_id" }
    );

    return { ok: true, instanceName, criada: true };
  } catch (error: any) {
    console.log("ERRO CRIAR INSTANCIA EVOLUTION:", error.response?.data || error.message);
    return { ok: false, instanceName, erro: error.response?.data || error.message };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("WEBHOOK MP:", body);

    const paymentId = extrairPaymentId(body);

    if (!paymentId) {
      return NextResponse.json({ ok: true, ignored: "Evento sem payment id" });
    }

    const payment = await buscarPagamentoMercadoPago(paymentId);
    const statusPagamento = normalizarStatusPagamento(payment.status);
    const metadata = payment.metadata || {};

    const cliente = await buscarOuCriarCliente(payment);

    const planoId = metadata.plano_id || cliente.plano_id || null;
    const plano = await buscarPlano(planoId);

    if (!plano) {
      await registrarPagamento({
        clienteId: cliente.id,
        payment,
        planoId,
        valorOriginal: Number(metadata.valor_original || payment.transaction_amount || 0),
        descontoValor: Number(metadata.desconto_valor || 0),
        cupomCodigo: metadata.cupom_codigo || null,
      });

      return NextResponse.json({
        ok: true,
        warning: "Pagamento registrado, mas plano não encontrado",
      });
    }

    const servicoId = metadata.servico_id || cliente.servico_id || plano.servico_id || null;
    const servico = await buscarServico(servicoId, plano);

    if (!servico) {
      await registrarPagamento({
        clienteId: cliente.id,
        payment,
        planoId: plano.id,
        valorOriginal: Number(metadata.valor_original || plano.valor || payment.transaction_amount || 0),
        descontoValor: Number(metadata.desconto_valor || 0),
        cupomCodigo: metadata.cupom_codigo || null,
      });

      return NextResponse.json({
        ok: true,
        warning: "Pagamento registrado, mas serviço não encontrado",
      });
    }

    await registrarPagamento({
      clienteId: cliente.id,
      payment,
      planoId: plano.id,
      valorOriginal: Number(metadata.valor_original || plano.valor || payment.transaction_amount || 0),
      descontoValor: Number(metadata.desconto_valor || 0),
      cupomCodigo: metadata.cupom_codigo || null,
    });

    if (statusPagamento !== "approved") {
      await marcarAguardandoPagamento(cliente.id, servico.id);

      return NextResponse.json({
        ok: true,
        status: statusPagamento,
        action: "pagamento_nao_aprovado",
      });
    }

    const novaExpiracao = await ativarOuRenovarServico({
      cliente,
      servico,
      plano,
      meses: Number(metadata.meses || plano.meses || 1),
    });

    const instancia = await criarOuGarantirInstancia(cliente.id);

    return NextResponse.json({
      ok: true,
      status: statusPagamento,
      cliente_id: cliente.id,
      servico_id: servico.id,
      plano_id: plano.id,
      data_expiracao: novaExpiracao.toISOString(),
      instancia,
    });
  } catch (error: any) {
    console.log("ERRO WEBHOOK MP:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error: "Erro no webhook Mercado Pago",
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "webhook mercadopago ativo",
  });
}
