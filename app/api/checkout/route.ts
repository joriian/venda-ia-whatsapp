import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { plano, valor, email } = body;

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const response = await axios.post(
      "https://api.mercadopago.com/checkout/preferences",
      {
        items: [
          {
            title: `IA WhatsApp - ${plano}`,
            quantity: 1,
            currency_id: "BRL",
            unit_price: Number(valor),
          },
        ],
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
      { error: "Erro ao criar pagamento", detalhe: error.response?.data },
      { status: 500 }
    );
  }
}