import { NextResponse } from "next/server";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { clienteId } = await req.json();

    if (!clienteId) {
      return NextResponse.json({ error: "Cliente obrigatório" }, { status: 400 });
    }

    const { data: cliente } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .eq("id", clienteId)
      .single();

    if (!cliente) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const { data: plano } = await supabase
      .from("planos")
      .select("*")
      .eq("id", cliente.plano_id)
      .single();

    if (!plano) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

    const response = await axios.post(
      "https://api.mercadopago.com/checkout/preferences",
      {
        items: [
          {
            title: `Renovação - ${plano.nome}`,
            quantity: 1,
            currency_id: "BRL",
            unit_price: Number(plano.valor),
          },
        ],
        payer: {
          email: cliente.email || "cliente@email.com",
        },
        external_reference: cliente.id,
        metadata: {
          cliente_id: cliente.id,
          plano_id: plano.id,
          meses: plano.meses,
          valor: plano.valor,
          renovacao: true,
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

    return NextResponse.json({
      url: response.data.init_point,
    });
  } catch (error: any) {
    console.log("ERRO CRIAR PAGAMENTO:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error: true,
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}