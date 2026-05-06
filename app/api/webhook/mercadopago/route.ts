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

      return NextResponse.json({ ok: true, ignored: "cliente_id_ausente" });
    }

    const { data: clienteExistente } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .eq("id", clienteId)
      .single();

    if (!clienteExistente) {
      console.log("WEBHOOK IGNORADO: cliente não encontrado", clienteId);
      return NextResponse.json({ ok: true, ignored: "cliente_nao_encontrado" });
    }

    const planoId = pagamento.metadata?.plano_id || clienteExistente.plano_id;
    const servicoId = pagamento.metadata?.servico_id || clienteExistente.servico_id;

    const { data: plano } = await supabase
      .from("planos")
      .select("*")
      .eq("id", planoId)
      .single();

    const meses = Number(pagamento.metadata?.meses || plano?.meses || 1);
    const valor = Number(pagamento.transaction_amount || pagamento.metadata?.valor || 0);

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

    const agora = new Date();

    const baseExpiracao =
      clienteExistente.data_expiracao &&
      new Date(clienteExistente.data_expiracao) > agora
        ? new Date(clienteExistente.data_expiracao)
        : agora;

    const novaExpiracao = new Date(baseExpiracao);
    novaExpiracao.setMonth(novaExpiracao.getMonth() + meses);

    await supabase
      .from("clientes_ia_whatsapp")
      .update({
        status: "ativo",
        plano_id: planoId,
        servico_id: servicoId,
        data_inicio: agora.toISOString(),
        data_expiracao: novaExpiracao.toISOString(),
      })
      .eq("id", clienteId);

    if (servicoId) {
      const { data: servicoAtual } = await supabase
        .from("cliente_servicos")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("servico_id", servicoId)
        .maybeSingle();

      const baseServico =
        servicoAtual?.data_expiracao &&
        new Date(servicoAtual.data_expiracao) > agora
          ? new Date(servicoAtual.data_expiracao)
          : agora;

      const expServico = new Date(baseServico);
      expServico.setMonth(expServico.getMonth() + meses);

      await supabase.from("cliente_servicos").upsert(
        {
          cliente_id: clienteId,
          servico_id: servicoId,
          plano_id: planoId,
          status: "ativo",
          data_inicio: agora.toISOString(),
          data_expiracao: expServico.toISOString(),
          updated_at: agora.toISOString(),
        },
        {
          onConflict: "cliente_id,servico_id",
        }
      );
    }

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

    const instanciaEvolution = lista.find((i: any) => {
      return i?.name === instanceName || i?.instanceName === instanceName;
    });

    if (!instanciaEvolution) {
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

    const statusEvolution = instanciaEvolution?.connectionStatus || "aguardando_qrcode";

    const { data: instanciaBanco } = await supabase
      .from("instancias_evolution")
      .select("*")
      .eq("cliente_id", clienteId)
      .maybeSingle();

    if (!instanciaBanco) {
      await supabase.from("instancias_evolution").insert({
        cliente_id: clienteId,
        instance_name: instanceName,
        status: statusEvolution,
      });
    } else {
      await supabase
        .from("instancias_evolution")
        .update({
          instance_name: instanceName,
          status: statusEvolution === "open" ? "conectado" : statusEvolution,
        })
        .eq("cliente_id", clienteId);
    }

    return NextResponse.json({
      ok: true,
      clienteId,
      servicoId,
      planoId,
      instanceName,
      novaExpiracao: novaExpiracao.toISOString(),
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