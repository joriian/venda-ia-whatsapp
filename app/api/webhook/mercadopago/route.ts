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

    console.log("WEBHOOK MP:", body);

    const paymentId = body.data?.id;

    if (!paymentId) {
      return NextResponse.json({ ok: true });
    }

    const pagamento = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        },
      }
    );

    const payment = pagamento.data;

    if (payment.status !== "approved") {
      return NextResponse.json({ ok: true });
    }

    const planoId = payment.metadata?.plano_id;
    const meses = Number(payment.metadata?.meses || 1);
    const email = payment.payer?.email || "";
    const valor = Number(payment.transaction_amount || 0);

    const instanceName = `cliente_${paymentId}`;

    await supabase.from("pagamentos_ia_whatsapp").insert({
      mercado_pago_id: String(paymentId),
      status: "approved",
      valor,
    });

    await axios.post(
      `${process.env.EVOLUTION_API_URL}/instance/create`,
      {
        instanceName,
      },
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
          "Content-Type": "application/json",
        },
      }
    );

    await supabase.from("instancias_evolution").insert({
      instance_name: instanceName,
      status: "aguardando_qrcode",
    });

    console.log("INSTANCIA CRIADA:", instanceName);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.log("ERRO WEBHOOK:", error.response?.data || error.message);

    return NextResponse.json({ error: true }, { status: 500 });
  }
}