import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const hoje = new Date();
    const daqui3dias = new Date();
    daqui3dias.setDate(hoje.getDate() + 3);

    const { data: clientes } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .eq("status", "ativo");

    for (const cliente of clientes || []) {
      if (!cliente.data_expiracao) continue;

      const exp = new Date(cliente.data_expiracao);

      const diff =
        Math.ceil((exp.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      if (diff <= 3 && diff > 0) {
        const instanceName = `cliente_${cliente.id}`.replace(/-/g, "");

        try {
          await axios.post(
            `${process.env.EVOLUTION_API_URL}/message/sendText/${instanceName}`,
            {
              number: cliente.telefone,
              text: `⚠️ Seu plano vence em ${diff} dia(s). Renove para não perder o acesso.`,
            },
            {
              headers: {
                apikey: process.env.EVOLUTION_API_KEY!,
              },
            }
          );

          console.log("Aviso enviado:", cliente.telefone);
        } catch (err) {
          console.log("Erro ao enviar aviso:", cliente.telefone);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.log("ERRO CRON:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}