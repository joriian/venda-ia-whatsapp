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
    const { planoId, email } = body;

    // 🔥 BUSCAR DO BANCO
    const { data: plano, error } = await supabase
      .from("planos")
      .select("*")
      .eq("id", planoId)
      .single();

    if (error || !plano) {
      return NextResponse.json(
        { error: "Plano não encontrado" },
        { status: 404 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
        metadata: {
          plano_id: plano.id,
          meses: plano.meses,
          valor: plano.valor,
        },
        payer: {
          email: email || "cliente@email.com",
        },
        back_urls: {
          success: `${siteUrl}/sucesso`,
          failure: `${siteUrl}/erro`,
          pending: `${siteUrl}/pendente`,
        },
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
      init_point: response.data.init_point,
    });
  } catch (error: any) {
    console.log("ERRO MP:", error.response?.data || error.message);

    return NextResponse.json(
      { error: "Erro ao criar pagamento" },
      { status: 500 }
    );
  }
}