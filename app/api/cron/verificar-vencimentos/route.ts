import { NextResponse } from "next/server";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log("CRON: verificando vencimentos...");

    const agora = new Date().toISOString();

    const { data: clientes } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .lte("data_expiracao", agora);

    if (!clientes || clientes.length === 0) {
      console.log("CRON: nenhum cliente vencido");
      return NextResponse.json({ ok: true, clientes: 0 });
    }

    for (const cliente of clientes) {
      try {
        console.log("CLIENTE VENCIDO:", cliente.id);

        // já vencido? evita loop
        if (cliente.status === "vencido") {
          console.log("JA BLOQUEADO:", cliente.id);
          continue;
        }

        // 🔴 ATUALIZA STATUS
        await supabase
          .from("clientes_ia_whatsapp")
          .update({ status: "vencido" })
          .eq("id", cliente.id);

        const instanceName = `cliente_${cliente.id}`.replace(/-/g, "");

        // 🔴 BUSCA INSTANCIA
        const { data: instancia } = await supabase
          .from("instancias_evolution")
          .select("*")
          .eq("cliente_id", cliente.id)
          .maybeSingle();

        // 🔴 BLOQUEAR WHATSAPP
        if (instancia?.status === "conectado") {
          try {
            console.log("DESCONECTANDO:", instanceName);

            await axios.post(
              `${process.env.EVOLUTION_API_URL}/instance/logout`,
              { instanceName },
              {
                headers: {
                  apikey: process.env.EVOLUTION_API_KEY!,
                },
              }
            );

            console.log("DESCONECTADO:", instanceName);

            await supabase
              .from("instancias_evolution")
              .update({ status: "desconectado" })
              .eq("cliente_id", cliente.id);
          } catch (err: any) {
            console.log(
              "ERRO AO DESCONECTAR:",
              err.response?.data || err.message
            );
          }
        }

        // 🟢 GERAR LINK DE PAGAMENTO
        const { data: pagamento } = await axios.post(
          `${process.env.APP_URL}/api/pagamento/criar`,
          {
            cliente_id: cliente.id,
          }
        );

        const linkPagamento = pagamento?.link;

        // 🟢 ENVIAR MENSAGEM
        try {
          console.log("ENVIANDO COBRANÇA:", cliente.telefone);

          await axios.post(
            `${process.env.EVOLUTION_API_URL}/message/sendText/${instanceName}`,
            {
              number: cliente.telefone,
              text: `⚠️ Seu plano venceu.

Para continuar usando, realize o pagamento:

${linkPagamento}`,
            },
            {
              headers: {
                apikey: process.env.EVOLUTION_API_KEY!,
              },
            }
          );
        } catch (err: any) {
          console.log(
            "ERRO AO ENVIAR MSG:",
            err.response?.data || err.message
          );
        }
      } catch (err: any) {
        console.log("ERRO CLIENTE:", cliente.id, err.message);
      }
    }

    return NextResponse.json({
      ok: true,
      clientes: clientes.length,
    });
  } catch (error: any) {
    console.log("ERRO CRON:", error.message);

    return NextResponse.json(
      { error: true },
      { status: 500 }
    );
  }
}