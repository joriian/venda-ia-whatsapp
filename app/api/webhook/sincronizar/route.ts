import { NextResponse } from "next/server";

import { POST as webhookMercadoPago } from "../../webhook/mercadopago/route";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const paymentId =
      searchParams.get("payment_id") ||
      searchParams.get("collection_id") ||
      searchParams.get("id");

    if (!paymentId) {
      return NextResponse.json(
        {
          error: "ID do pagamento obrigatório",
        },
        { status: 400 }
      );
    }

    const fakeRequest = new Request(req.url, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        type: "payment",

        data: {
          id: paymentId,
        },
      }),
    });

    return await webhookMercadoPago(fakeRequest);
  } catch (error: any) {
    console.log(
      "ERRO SINCRONIZAR PAGAMENTO:",
      error?.response?.data ||
        error?.message ||
        error
    );

    return NextResponse.json(
      {
        error:
          "Erro ao sincronizar pagamento",

        detalhe:
          error?.response?.data ||
          error?.message ||
          "Erro interno",
      },
      { status: 500 }
    );
  }
}