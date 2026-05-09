import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { gerarInstanceName } from "@/lib/evolution-config";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || "NEXORA_SECRET_2026";

async function validarCliente(token: string) {
  if (!token) return null;

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (decoded?.id && decoded?.tipo === "cliente") {
      const { data } = await supabase
        .from("clientes_ia_whatsapp")
        .select("*")
        .eq("id", decoded.id)
        .maybeSingle();

      if (data) return data;
    }
  } catch {}

  const { data } = await supabase
    .from("clientes_ia_whatsapp")
    .select("*")
    .eq("session_token", token)
    .maybeSingle();

  if (!data) return null;

  const expira = data.session_expires_at
    ? new Date(data.session_expires_at)
    : null;

  if (expira && expira < new Date()) return null;

  return data;
}

async function buscarServicoExistente(clienteId: string, servicoId: string) {
  const { data } = await supabase
    .from("cliente_servicos")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("servico_id", servicoId)
    .in("status", ["ativo", "aguardando_pagamento", "vencido"])
    .order("created_at", { ascending: false })
    .limit(1);

  return data?.[0] || null;
}

async function validarCupom(codigo: string | null) {
  if (!codigo) return null;

  const { data } = await supabase
    .from("cupons")
    .select("*")
    .ilike("codigo", codigo.trim())
    .eq("ativo", true)
    .maybeSingle();

  if (!data) return null;

  const agora = new Date();

  if (data.data_inicio && new Date(data.data_inicio) > agora) return null;
  if (data.data_fim && new Date(data.data_fim) < agora) return null;

  if (
    data.limite_usos &&
    Number(data.usos_atuais || 0) >= Number(data.limite_usos)
  ) {
    return null;
  }

  return data;
}

function diasDoPlano(plano: any) {
  return Number(plano.meses || 1) * 30;
}

function calcularCreditoProporcional(vinculoAtual: any, planoAtual: any) {
  if (!vinculoAtual?.data_expiracao || !planoAtual?.valor) {
    return {
      dias_restantes: 0,
      credito: 0,
    };
  }

  const agora = new Date();
  const expira = new Date(vinculoAtual.data_expiracao);

  if (expira <= agora) {
    return {
      dias_restantes: 0,
      credito: 0,
    };
  }

  const msRestantes = expira.getTime() - agora.getTime();
  const diasRestantes = Math.ceil(msRestantes / (1000 * 60 * 60 * 24));

  const valorPlanoAtual = Number(planoAtual.valor || 0);
  const totalDias = diasDoPlano(planoAtual);

  const valorDia = totalDias > 0 ? valorPlanoAtual / totalDias : 0;
  const credito = Number((diasRestantes * valorDia).toFixed(2));

  return {
    dias_restantes: diasRestantes,
    credito,
  };
}

function calcularDescontoCupom(valor: number, cupom: any) {
  if (!cupom) return 0;

  let desconto = 0;

  if (cupom.tipo === "percentual") {
    desconto = (valor * Number(cupom.valor || 0)) / 100;
  } else {
    desconto = Number(cupom.valor || 0);
  }

  if (desconto > valor) desconto = valor;

  return Number(desconto.toFixed(2));
}

function calcularValores(params: {
  valorPlanoNovo: number;
  cupom: any;
  creditoProporcional: number;
}) {
  const valorOriginal = Number(params.valorPlanoNovo || 0);
  const credito = Math.min(valorOriginal, Number(params.creditoProporcional || 0));

  const subtotal = Math.max(0, valorOriginal - credito);
  const descontoCupom = calcularDescontoCupom(subtotal, params.cupom);

  let valorFinal = Number((subtotal - descontoCupom).toFixed(2));

  if (valorFinal <= 0) {
    valorFinal = 0.01;
  }

  return {
    valor_original: valorOriginal,
    credito_proporcional: credito,
    desconto_valor: descontoCupom,
    valor_final: valorFinal,
  };
}

async function criarOuAtualizarVinculoPendente(params: {
  cliente: any;
  servico: any;
  plano: any;
  vinculoExistente: any;
  tipoMovimento: string;
}) {
  const { cliente, servico, plano, vinculoExistente, tipoMovimento } = params;

  const instanceName =
    vinculoExistente?.instance_name ||
    gerarInstanceName(cliente.id, servico.slug || servico.nome || "servico");

  const checkoutExpiraEm = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  if (vinculoExistente?.id) {
    const { data, error } = await supabase
      .from("cliente_servicos")
      .update({
        plano_id: plano.id,
        status:
          vinculoExistente.status === "ativo"
            ? "ativo"
            : "aguardando_pagamento",
        checkout_expira_em: checkoutExpiraEm,
        workflow_id: servico.workflow_id || null,
        webhook_url: servico.webhook_url || null,
        instance_name: instanceName,
        movimento_checkout: tipoMovimento,
        plano_checkout_id: plano.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vinculoExistente.id)
      .select("id")
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar vínculo: ${error.message}`);
    }

    return data.id;
  }

  const { data, error } = await supabase
    .from("cliente_servicos")
    .insert({
      id: crypto.randomUUID(),
      cliente_id: cliente.id,
      servico_id: servico.id,
      plano_id: plano.id,
      status: "aguardando_pagamento",
      data_inicio: null,
      data_expiracao: null,
      workflow_id: servico.workflow_id || null,
      webhook_url: servico.webhook_url || null,
      instance_name: instanceName,
      evolution_status: "aguardando_pagamento",
      evolution_configurado: false,
      checkout_expira_em: checkoutExpiraEm,
      movimento_checkout: tipoMovimento,
      plano_checkout_id: plano.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Erro ao criar vínculo: ${error.message}`);
  }

  return data.id;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const token = body.token;
    const servicoId = body.servico_id || body.servicoId;
    const planoId = body.plano_id || body.planoId;
    const cupomCodigo = body.cupom_codigo || body.cupomCodigo || null;

    if (!token) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    const cliente = await validarCliente(token);

    if (!cliente) {
      return NextResponse.json({ error: "Sessão expirada" }, { status: 401 });
    }

    if (!cliente.telefone_verificado) {
      return NextResponse.json(
        {
          error:
            "Antes de contratar, verifique seu número de WhatsApp na área do cliente.",
        },
        { status: 403 }
      );
    }

    if (cliente.status === "bloqueado") {
      return NextResponse.json(
        {
          error: "Sua conta está bloqueada. Entre em contato com o suporte.",
        },
        { status: 403 }
      );
    }

    if (!servicoId || !planoId) {
      return NextResponse.json(
        { error: "Serviço e plano são obrigatórios" },
        { status: 400 }
      );
    }

    const { data: servico } = await supabase
      .from("servicos_ia")
      .select("*")
      .eq("id", servicoId)
      .eq("ativo", true)
      .maybeSingle();

    if (!servico) {
      return NextResponse.json(
        { error: "Serviço não encontrado ou inativo" },
        { status: 404 }
      );
    }

    const { data: planoNovo } = await supabase
      .from("planos")
      .select("*")
      .eq("id", planoId)
      .eq("servico_id", servicoId)
      .eq("ativo", true)
      .maybeSingle();

    if (!planoNovo) {
      return NextResponse.json(
        { error: "Plano não encontrado ou inativo" },
        { status: 404 }
      );
    }

    const vinculoExistente = await buscarServicoExistente(cliente.id, servico.id);

    let tipoMovimento = "nova_contratacao";
    let creditoProporcional = 0;
    let diasRestantes = 0;

    if (vinculoExistente?.id) {
      if (vinculoExistente.plano_id === planoNovo.id) {
        tipoMovimento = "renovacao";
      } else {
        tipoMovimento = "troca_plano";

        const { data: planoAtual } = await supabase
          .from("planos")
          .select("*")
          .eq("id", vinculoExistente.plano_id)
          .maybeSingle();

        const credito = calcularCreditoProporcional(vinculoExistente, planoAtual);

        creditoProporcional = credito.credito;
        diasRestantes = credito.dias_restantes;
      }
    }

    const cupom = await validarCupom(cupomCodigo);

    const valores = calcularValores({
      valorPlanoNovo: Number(planoNovo.valor || 0),
      cupom,
      creditoProporcional,
    });

    const clienteServicoId = await criarOuAtualizarVinculoPendente({
      cliente,
      servico,
      plano: planoNovo,
      vinculoExistente,
      tipoMovimento,
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "";

    const titulo =
      tipoMovimento === "nova_contratacao"
        ? `${servico.nome} - ${planoNovo.nome}`
        : tipoMovimento === "renovacao"
        ? `Renovação - ${servico.nome} - ${planoNovo.nome}`
        : `Troca de plano - ${servico.nome} - ${planoNovo.nome}`;

    const preferenceBody = {
      items: [
        {
          id: planoNovo.id,
          title: titulo,
          description: planoNovo.descricao || servico.descricao || "",
          quantity: 1,
          currency_id: "BRL",
          unit_price: valores.valor_final,
        },
      ],

      payer: {
        name: cliente.nome,
        email: cliente.email,
      },

      metadata: {
        cliente_id: cliente.id,
        cliente_servico_id: clienteServicoId,
        servico_id: servico.id,
        plano_id: planoNovo.id,
        meses: planoNovo.meses,
        tipo_movimento: tipoMovimento,
        dias_restantes_credito: diasRestantes,
        credito_proporcional: valores.credito_proporcional,
        valor_original: valores.valor_original,
        desconto_valor: valores.desconto_valor,
        cupom_codigo: cupom?.codigo || null,
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone || null,
      },

      notification_url:
        process.env.MERCADOPAGO_WEBHOOK_URL ||
        `${appUrl}/api/webhook/mercadopago`,

      back_urls: {
        success: `${appUrl}/aguardando-pagamento?cliente=${cliente.id}`,
        pending: `${appUrl}/aguardando-pagamento?cliente=${cliente.id}`,
        failure: `${appUrl}/aguardando-pagamento?cliente=${cliente.id}`,
      },

      auto_return: "approved",
    };

    const response = await axios.post(
      "https://api.mercadopago.com/checkout/preferences",
      preferenceBody,
      {
        headers: {
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (cupom?.id) {
      await supabase
        .from("cupons")
        .update({
          usos_atuais: Number(cupom.usos_atuais || 0) + 1,
        })
        .eq("id", cupom.id);
    }

    return NextResponse.json({
      ok: true,
      init_point: response.data.init_point,
      sandbox_init_point: response.data.sandbox_init_point,
      preference_id: response.data.id,
      cliente_servico_id: clienteServicoId,
      tipo_movimento: tipoMovimento,
      dias_restantes_credito: diasRestantes,
      valores,
    });
  } catch (error: any) {
    console.log("ERRO CHECKOUT CLIENTE:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error: "Erro ao gerar pagamento",
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}