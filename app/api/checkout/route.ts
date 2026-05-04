import { NextResponse } from "next/server";
import axios from "axios";

const PLANOS = {
  mensal: {
    nome: "Plano Mensal",
    meses: 1,
    valor: 29.9,
  },
  trimestral: {
    nome: "Plano Trimestral",
    meses: 3,
    valor: 79.9,
  },
  semestral: {
    nome: "Plano Semestral",
    meses: 6,
    valor: 149.9,
  },
  anual: {
    nome: "Plano Anual",
    meses: 12,
    valor: 279.9,
  },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { planoId, email } = body;

    const plano = PLANOS[planoId as keyof typeof PLANOS];

    if (!plano) {
      return NextResponse.json(
        { error: "Plano inválido" },
        { status: 400 }
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
            unit_price: plano.valor,
          },
        ],
        payer: {
          email: email || "cliente@email.com",
        },
        metadata: {
          plano_id: planoId,
          plano_nome: plano.nome,
          meses: plano.meses,
          valor: plano.valor,
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