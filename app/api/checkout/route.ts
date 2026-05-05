import { NextResponse } from "next/server";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { planoId, email, nome, telefone } = body;

    const { data: plano } = await supabase
      .from("planos")
      .select("*")
      .eq("id", planoId)
      .eq("ativo", true)
      .single();

    if (!plano) {
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
    }

    const { data: cliente } = await supabase
      .from("clientes_ia_whatsapp")
      .insert({
        nome: nome || "Cliente",
        email: email || "",
        telefone: telefone || "",
        plano_id: plano.id,
        status: "aguardando_pagamento",
      })
      .select()
      .single();

    if (!cliente) {
      return NextResponse.json({ error: "Erro ao criar cliente" }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

    const response = await axios.post(
      "https://api.mercadopago.com/checkout/preferences",
      {
        items: [
          {
            title: `IA WhatsApp - ${plano.nome}`,
            quantity: 1,
            currency_id: "BRL",
            unit_price: Number(plano.valor),
          },
        ],
        payer: {
          email: email || "cliente@email.com",
        },
        external_reference: cliente.id,
        metadata: {
          cliente_id: cliente.id,
          plano_id: plano.id,
          meses: plano.meses,
          valor: plano.valor,
        },
        back_urls: {
          success: `${siteUrl}/aguardando-pagamento?cliente=${cliente.id}`,
          failure: `${siteUrl}/erro`,
          pending: `${siteUrl}/aguardando-pagamento?cliente=${cliente.id}`,
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

    return NextResponse.json({ init_point: response.data.init_point });
  } catch (error: any) {
    console.log("ERRO CHECKOUT:", error.response?.data || error.message);
    return NextResponse.json({ error: "Erro ao criar pagamento" }, { status: 500 });
  }
}