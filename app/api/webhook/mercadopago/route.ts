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
      return NextResponse.json({ ok: true, ignored: "evento_sem_payment_id" });
    }

    const { data: pagamento } = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        },
      }
    );

    if (pagamento.status !== "approved") {
      return NextResponse.json({ ok: true, ignored: "pagamento_nao_aprovado" });
    }

    const clienteId =
      pagamento.metadata?.cliente_id ||
      pagamento.external_reference ||
      null;

    if (!clienteId || clienteId === "null" || clienteId === "undefined") {
      console.log("WEBHOOK IGNORADO: clienteId ausente", {
        paymentId,
        metadata: pagamento.metadata,
        external_reference: pagamento.external_reference,
      });

      return NextResponse.json({
        ok: true,
        ignored: "cliente_id_ausente",
      });
    }

    const planoId = pagamento.metadata?.plano_id || null;
    const meses = Number(pagamento.metadata?.meses || 1);
    const valor = Number(pagamento.transaction_amount || 0);

    const { data: clienteExistente } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .eq("id", clienteId)
      .single();

    if (!clienteExistente) {
      console.log("WEBHOOK IGNORADO: cliente não encontrado", clienteId);

      return NextResponse.json({
        ok: true,
        ignored: "cliente_nao_encontrado",
      });
    }

    const dataInicio = new Date();
    const dataExpiracao = new Date();
    dataExpiracao.setMonth(dataExpiracao.getMonth() + meses);

    const { data: pagamentoExistente } = await supabase
      .from("pagamentos_ia_whatsapp")
      .select("*")
      .eq("payment_id", String(paymentId))
      .maybeSingle();

    if (!pagamentoExistente) {
      await supabase.from("pagamentos_ia_whatsapp").insert({
        cliente_id: clienteId,
        plano_id: planoId,
        payment_id: String(paymentId),
        mercado_pago_id: String(paymentId),
        status: "approved",
        valor,
      });
    }

    await supabase
      .from("clientes_ia_whatsapp")
      .update({
        status: "ativo",
        plano_id: planoId || clienteExistente.plano_id,
        data_inicio: dataInicio.toISOString(),
        data_expiracao: dataExpiracao.toISOString(),
      })
      .eq("id", clienteId);

    const instanceName = `cliente_${clienteId}`.replace(/-/g, "");

    const instances = await axios.get(
      `${process.env.EVOLUTION_API_URL}/instance/fetchInstances`,
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
        },
      }
    );

    const lista = Array.isArray(instances.data)
      ? instances.data
      : instances.data?.instances || [];

    const jaExiste = lista.some((i: any) => {
      return i?.name === instanceName || i?.instanceName === instanceName;
    });

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
            "Content-Type": "application/json",
          },
        }
      );

      console.log("INSTANCIA CRIADA:", instanceName);
    } else {
      console.log("INSTANCIA JÁ EXISTE:", instanceName);
    }

    const { data: instanciaBanco } = await supabase
      .from("instancias_evolution")
      .select("*")
      .eq("cliente_id", clienteId)
      .maybeSingle();

    if (!instanciaBanco) {
      await supabase.from("instancias_evolution").insert({
        cliente_id: clienteId,
        instance_name: instanceName,
        status: "aguardando_qrcode",
      });
    }

    return NextResponse.json({
      ok: true,
      clienteId,
      instanceName,
    });
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