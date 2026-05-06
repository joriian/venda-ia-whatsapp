import { NextResponse } from "next/server";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validarCliente(token: string) {
  const { data: cliente } = await supabase
    .from("clientes_ia_whatsapp")
    .select("*")
    .eq("session_token", token)
    .maybeSingle();

  if (!cliente) return null;

  const expira = cliente.session_expires_at
    ? new Date(cliente.session_expires_at)
    : null;

  if (!expira || expira < new Date()) return null;

  return cliente;
}

export async function POST(req: Request) {
  try {
    const { token, servicoId, planoId } = await req.json();

    if (!token || !servicoId || !planoId) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 });
    }

    const cliente = await validarCliente(token);

    if (!cliente) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    const { data: servico } = await supabase
      .from("servicos_ia")
      .select("*")
      .eq("id", servicoId)
      .eq("ativo", true)
      .maybeSingle();

    const { data: plano } = await supabase
      .from("planos")
      .select("*")
      .eq("id", planoId)
      .eq("ativo", true)
      .maybeSingle();

    if (!servico || !plano) {
      return NextResponse.json({ error: "Serviço ou plano inválido" }, { status: 400 });
    }

    await supabase.from("cliente_servicos").upsert(
      {
        cliente_id: cliente.id,
        servico_id: servicoId,
        plano_id: planoId,
        status: "aguardando_pagamento",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cliente_id,servico_id" }
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

    const response = await axios.post(
      "https://api.mercadopago.com/checkout/preferences",
      {
        items: [
          {
            title: `${servico.nome} - ${plano.nome}`,
            quantity: 1,
            currency_id: "BRL",
            unit_price: Number(plano.valor),
          },
        ],
        payer: {
          email: cliente.email,
          name: cliente.nome,
        },
        external_reference: cliente.id,
        metadata: {
          cliente_id: cliente.id,
          servico_id: servico.id,
          plano_id: plano.id,
          meses: plano.meses,
          valor: plano.valor,
        },
        back_urls: {
          success: `${siteUrl}/cliente`,
          failure: `${siteUrl}/cliente`,
          pending: `${siteUrl}/cliente`,
        },
        auto_return: "approved",
        notification_url: `${siteUrl}/api/webhook/mercadopago`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    return NextResponse.json({
      ok: true,
      init_point: response.data.init_point,
    });
  } catch (error: any) {
    console.log("ERRO CLIENTE CHECKOUT:", error.response?.data || error.message);
    return NextResponse.json({ error: "Erro ao gerar pagamento" }, { status: 500 });
  }
}