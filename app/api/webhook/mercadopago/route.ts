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

    const paymentId = body.data?.id || body.resource;

    if (!paymentId || String(paymentId).startsWith("http")) {
      return NextResponse.json({ ok: true });
    }

    const { data: pagamentoResponse } = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        },
      }
    );

    if (pagamentoResponse.status !== "approved") {
      return NextResponse.json({ ok: true });
    }

    const clienteId =
      pagamentoResponse.metadata?.cliente_id ||
      pagamentoResponse.external_reference;

    const planoId = pagamentoResponse.metadata?.plano_id;
    const meses = Number(pagamentoResponse.metadata?.meses || 1);
    const valor = Number(pagamentoResponse.transaction_amount || 0);

    if (!clienteId) {
      throw new Error("Cliente ID não encontrado no pagamento");
    }

    const dataInicio = new Date();
    const dataExpiracao = new Date();
    dataExpiracao.setMonth(dataExpiracao.getMonth() + meses);

    await supabase.from("pagamentos_ia_whatsapp").insert({
      cliente_id: clienteId,
      plano_id: planoId,
      payment_id: String(paymentId),
      mercado_pago_id: String(paymentId),
      status: "approved",
      valor,
    });

    await supabase
      .from("clientes_ia_whatsapp")
      .update({
        status: "ativo",
        plano_id: planoId,
        data_inicio: dataInicio.toISOString(),
        data_expiracao: dataExpiracao.toISOString(),
      })
      .eq("id", clienteId);

    const instanceName = `cliente_${clienteId}`.replace(/-/g, "");

    const evolutionPayload = {
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    };

    console.log("CRIANDO INSTANCIA:", evolutionPayload);

    await axios.post(
      `${process.env.EVOLUTION_API_URL}/instance/create`,
      evolutionPayload,
      {
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.EVOLUTION_API_KEY!,
          Authorization: `Bearer ${process.env.EVOLUTION_API_KEY!}`,
        },
      }
    );

    await supabase.from("instancias_evolution").insert({
      cliente_id: clienteId,
      instance_name: instanceName,
      status: "aguardando_qrcode",
    });

    console.log("INSTANCIA CRIADA:", instanceName);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.log("ERRO WEBHOOK:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error: true,
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}