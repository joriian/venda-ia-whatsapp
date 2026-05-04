import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("WEBHOOK MP:", body);

    const paymentId = body.data?.id;

    if (!paymentId) {
      return NextResponse.json({ ok: true });
    }

    // buscar pagamento
    const pagamento = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        },
      }
    );

    const status = pagamento.data.status;

    if (status !== "approved") {
      return NextResponse.json({ ok: true });
    }

    // 🔥 AQUI VAMOS CRIAR INSTÂNCIA
    const instanceName = `cliente_${Date.now()}`;

    await axios.post(
      `${process.env.EVOLUTION_API_URL}/instance/create`,
      {
        instanceName,
        token: process.env.EVOLUTION_API_KEY,
      }
    );

    console.log("INSTANCIA CRIADA:", instanceName);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.log("ERRO WEBHOOK:", error.response?.data || error.message);

    return NextResponse.json({ error: true }, { status: 500 });
  }
}