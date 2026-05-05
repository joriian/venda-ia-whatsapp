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
    if (!paymentId) return NextResponse.json({ ok: true });

    const { data: pagamento } = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        },
      }
    );

    if (pagamento.status !== "approved") {
      return NextResponse.json({ ok: true });
    }

    const clienteId =
      pagamento.metadata?.cliente_id || pagamento.external_reference;

    const planoId = pagamento.metadata?.plano_id;
    const meses = Number(pagamento.metadata?.meses || 1);
    const valor = Number(pagamento.transaction_amount || 0);

    const dataInicio = new Date();
    const dataExpiracao = new Date();
    dataExpiracao.setMonth(dataExpiracao.getMonth() + meses);

    await supabase.from("pagamentos_ia_whatsapp").insert({
      cliente_id: clienteId,
      plano_id: planoId,
      payment_id: String(paymentId),
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

    // 🔥 VERIFICA SE JÁ EXISTE
    const instances = await axios.get(
      `${process.env.EVOLUTION_API_URL}/instance/fetchInstances`,
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
        },
      }
    );

    const jaExiste = instances.data.some(
      (i: any) => i.name === instanceName
    );

    if (!jaExiste) {
      await axios.post(
        `${process.env.EVOLUTION_API_URL}/instance/create`,
        {
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        },
        {
          headers: {
            apikey: process.env.EVOLUTION_API_KEY!,
          },
        }
      );

      console.log("INSTANCIA CRIADA:", instanceName);
    } else {
      console.log("INSTANCIA JÁ EXISTE:", instanceName);
    }

    await supabase.from("instancias_evolution").insert({
      cliente_id: clienteId,
      instance_name: instanceName,
      status: "aguardando_qrcode",
    });

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