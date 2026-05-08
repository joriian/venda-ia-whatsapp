import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import crypto from "crypto";
import { gerarInstanceName } from "@/lib/evolution-config";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validarCliente(token: string) {
  const { data } = await supabase
    .from("clientes_ia_whatsapp")
    .select("*")
    .eq("session_token", token)
    .maybeSingle();

  if (!data) return null;

  const expira = data.session_expires_at
    ? new Date(data.session_expires_at)
    : null;

  if (!expira || expira < new Date()) return null;

  return data;
}

async function buscarVinculoMesmoPlano(
  clienteId: string,
  servicoId: string,
  planoId: string
) {
  const agora = new Date().toISOString();

  const { data, error } = await supabase
    .from("cliente_servicos")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("servico_id", servicoId)
    .eq("plano_id", planoId)
    .or(
      `status.in.(ativo,aguardando_pagamento),checkout_expira_em.gte.${agora}`
    )
    .limit(1);

  if (error) {
    console.log("ERRO BUSCAR VÍNCULO MESMO PLANO:", error.message);
    return null;
  }

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

  if (data.data_inicio && new Date(data.data_inicio) > new Date()) return null;
  if (data.data_fim && new Date(data.data_fim) < new Date()) return null;

  if (
    data.limite_usos &&
    Number(data.usos_atuais || 0) >= Number(data.limite_usos)
  ) {
    return null;
  }

  return data;
}

function calcularValores(valor: number, cupom: any) {
  let desconto = 0;

  if (cupom) {
    if (cupom.tipo === "percentual") {
      desconto = (valor * Number(cupom.valor || 0)) / 100;
    } else {
      desconto = Number(cupom.valor || 0);
    }
  }

  if (desconto > valor) desconto = valor;

  return {
    valor_original: valor,
    desconto_valor: desconto,
    valor_final: Number((valor - desconto).toFixed(2)),
  };
}

async function criarOuAtualizarVinculoPendente(params: {
  cliente: any;
  servico: any;
  plano: any;
}) {
  const { cliente, servico, plano } = params;

  const instanceName = gerarInstanceName(
    cliente.id,
    servico.slug || servico.nome || "servico"
  );

  const checkoutExpiraEm = new Date(
    Date.now() + 30 * 60 * 1000
  ).toISOString();

  const { data: existente } = await supabase
    .from("cliente_servicos")
    .select("*")
    .eq("cliente_id", cliente.id)
    .eq("servico_id", servico.id)
    .eq("plano_id", plano.id)
    .limit(1);

  if (existente && existente.length > 0) {
    const vinculo = existente[0];

    const { error } = await supabase
      .from("cliente_servicos")
      .update({
        status: vinculo.status || "aguardando_pagamento",
        checkout_expira_em: checkoutExpiraEm,
        workflow_id: servico.workflow_id || null,
        webhook_url: servico.webhook_url || null,
        instance_name: instanceName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vinculo.id);

    if (error) {
      throw new Error(`Erro ao atualizar vínculo pendente: ${error.message}`);
    }

    return vinculo.id;
  }

  const { data: novo, error } = await supabase
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Erro ao criar vínculo pendente: ${error.message}`);
  }

  return novo.id;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const token = body.token;
    const servicoId = body.servico_id;
    const planoId = body.plano_id;
    const cupomCodigo = body.cupom_codigo || null;

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

    const { data: plano } = await supabase
      .from("planos")
      .select("*")
      .eq("id", planoId)
      .eq("servico_id", servicoId)
      .eq("ativo", true)
      .maybeSingle();

    if (!plano) {
      return NextResponse.json(
        { error: "Plano não encontrado ou inativo" },
        { status: 404 }
      );
    }

    const vinculoMesmoPlano = await buscarVinculoMesmoPlano(
      cliente.id,
      servico.id,
      plano.id
    );

    if (vinculoMesmoPlano) {
      return NextResponse.json(
        {
          error:
            "Você já possui este mesmo plano ativo ou com pagamento em andamento. Escolha outro plano do serviço.",
        },
        { status: 409 }
      );
    }

    const cupom = await validarCupom(cupomCodigo);
    const valores = calcularValores(Number(plano.valor || 0), cupom);

    if (valores.valor_final <= 0) {
      return NextResponse.json(
        { error: "Valor final inválido" },
        { status: 400 }
      );
    }

    const clienteServicoId = await criarOuAtualizarVinculoPendente({
      cliente,
      servico,
      plano,
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "";

    const preferenceBody = {
      items: [
        {
          id: plano.id,
          title: `${servico.nome} - ${plano.nome}`,
          description: plano.descricao || servico.descricao || "",
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
        plano_id: plano.id,
        meses: plano.meses,
        valor_original: valores.valor_original,
        desconto_valor: valores.desconto_valor,
        cupom_codigo: cupom?.codigo || null,
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone || null,
      },

      notification_url: process.env.MERCADOPAGO_WEBHOOK_URL,

      back_urls: {
        success: `${appUrl}/cliente?sucesso=1`,
        pending: `${appUrl}/cliente?pendente=1`,
        failure: `${appUrl}/cliente?erro=1`,
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