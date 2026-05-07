import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

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

  if (!expira || expira < new Date()) {
    return null;
  }

  return data;
}

function calcularDesconto(valor: number, cupom: any) {
  if (!cupom) {
    return {
      valorOriginal: valor,
      descontoValor: 0,
      valorFinal: valor,
    };
  }

  let descontoValor = 0;

  if (cupom.tipo === "percentual") {
    descontoValor = (valor * Number(cupom.valor || 0)) / 100;
  } else {
    descontoValor = Number(cupom.valor || 0);
  }

  if (descontoValor > valor) {
    descontoValor = valor;
  }

  return {
    valorOriginal: valor,
    descontoValor,
    valorFinal: Number(valor) - Number(descontoValor),
  };
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

  if (data.validade) {
    const validade = new Date(data.validade);

    if (validade < new Date()) {
      return null;
    }
  }

  if (
    data.maximo_uso &&
    Number(data.usado || 0) >= Number(data.maximo_uso)
  ) {
    return null;
  }

  return data;
}

async function clienteJaPossuiPlano(
  clienteId: string,
  servicoId: string,
  planoId: string
) {
  const { data } = await supabase
    .from("cliente_servicos")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("servico_id", servicoId)
    .eq("plano_id", planoId)
    .in("status", ["ativo", "aguardando_pagamento"]);

  return (data || []).length > 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      token,
      plano_id,
      servico_id,
      cupom_codigo,
    } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Sessão inválida" },
        { status: 401 }
      );
    }

    const cliente = await validarCliente(token);

    if (!cliente) {
      return NextResponse.json(
        { error: "Sessão expirada" },
        { status: 401 }
      );
    }

    if (!plano_id || !servico_id) {
      return NextResponse.json(
        { error: "Plano inválido" },
        { status: 400 }
      );
    }

    const { data: plano } = await supabase
      .from("planos")
      .select("*")
      .eq("id", plano_id)
      .maybeSingle();

    if (!plano) {
      return NextResponse.json(
        { error: "Plano não encontrado" },
        { status: 404 }
      );
    }

    const { data: servico } = await supabase
      .from("servicos_ia")
      .select("*")
      .eq("id", servico_id)
      .maybeSingle();

    if (!servico) {
      return NextResponse.json(
        { error: "Serviço não encontrado" },
        { status: 404 }
      );
    }

    const jaPossui = await clienteJaPossuiPlano(
      cliente.id,
      servico.id,
      plano.id
    );

    if (jaPossui) {
      return NextResponse.json(
        {
          error:
            "Você já possui este plano ativo ou aguardando pagamento.",
        },
        { status: 400 }
      );
    }

    const cupom = await validarCupom(cupom_codigo || null);

    const valores = calcularDesconto(
      Number(plano.valor || 0),
      cupom
    );

    const preferenceBody = {
      items: [
        {
          id: plano.id,
          title: `${servico.nome} - ${plano.nome}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number(valores.valorFinal),
        },
      ],

      payer: {
        name: cliente.nome,
        email: cliente.email,
      },

      metadata: {
        cliente_id: cliente.id,
        servico_id: servico.id,
        plano_id: plano.id,
        meses: plano.meses,
        valor_original: valores.valorOriginal,
        desconto_valor: valores.descontoValor,
        cupom_codigo: cupom?.codigo || null,
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone || null,
      },

      notification_url:
        process.env.MERCADOPAGO_WEBHOOK_URL,

      auto_return: "approved",

      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/cliente?sucesso=1`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/cliente?pendente=1`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/cliente?erro=1`,
      },
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
          usado: Number(cupom.usado || 0) + 1,
        })
        .eq("id", cupom.id);
    }

    return NextResponse.json({
      ok: true,
      init_point: response.data.init_point,
      sandbox_init_point: response.data.sandbox_init_point,

      plano: {
        id: plano.id,
        nome: plano.nome,
      },

      servico: {
        id: servico.id,
        nome: servico.nome,
      },

      valores,
    });
  } catch (error: any) {
    console.log(
      "ERRO CHECKOUT CLIENTE:",
      error.response?.data || error.message
    );

    return NextResponse.json(
      {
        error: "Erro ao gerar pagamento",
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}