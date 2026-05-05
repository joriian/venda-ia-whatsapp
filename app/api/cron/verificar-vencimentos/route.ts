import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EVOLUTION_URL = process.env.EVOLUTION_API_URL!;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY!;

function limparTelefone(telefone: string) {
  return String(telefone || "").replace(/\D/g, "");
}

async function enviarMensagem(instanceName: string, telefone: string, texto: string) {
  const numero = limparTelefone(telefone);

  if (!numero) return;

  await axios.post(
    `${EVOLUTION_URL}/message/sendText/${instanceName}`,
    {
      number: numero,
      text: texto,
    },
    {
      headers: {
        apikey: EVOLUTION_KEY,
        "Content-Type": "application/json",
      },
    }
  );
}

async function desconectarInstancia(instanceName: string) {
  try {
    await axios.delete(`${EVOLUTION_URL}/instance/logout/${instanceName}`, {
      headers: {
        apikey: EVOLUTION_KEY,
      },
    });
  } catch (error: any) {
    console.log(
      "INSTÂNCIA NÃO DESCONECTADA:",
      instanceName,
      error.response?.data || error.message
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    console.log("CRON: verificando vencimentos...");

    const hoje = new Date();

    const { data: clientes, error } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .in("status", ["ativo"]);

    if (error) {
      console.log("ERRO SUPABASE:", error);
      return NextResponse.json({ error: true }, { status: 500 });
    }

    let avisados = 0;
    let vencidos = 0;

    for (const cliente of clientes || []) {
      if (!cliente.data_expiracao) continue;

      const expiracao = new Date(cliente.data_expiracao);
      const diffDias = Math.ceil(
        (expiracao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
      );

      const instanceName = `cliente_${cliente.id}`.replace(/-/g, "");

      if (diffDias <= 3 && diffDias > 0) {
        try {
          await enviarMensagem(
            instanceName,
            cliente.telefone,
            `Olá, ${cliente.nome || "cliente"}! Seu plano vence em ${diffDias} dia(s). Renove para não perder o acesso ao sistema.`
          );

          avisados++;
          console.log("AVISO ENVIADO:", cliente.telefone);
        } catch (error: any) {
          console.log("ERRO AO ENVIAR AVISO:", error.response?.data || error.message);
        }
      }

      if (diffDias <= 0) {
        try {
          await enviarMensagem(
            instanceName,
            cliente.telefone,
            `Olá, ${cliente.nome || "cliente"}! Seu plano venceu e o acesso foi bloqueado. Renove para continuar usando.`
          );
        } catch (error: any) {
          console.log("ERRO AO ENVIAR BLOQUEIO:", error.response?.data || error.message);
        }

        await desconectarInstancia(instanceName);

        await supabase
          .from("clientes_ia_whatsapp")
          .update({
            status: "vencido",
          })
          .eq("id", cliente.id);

        await supabase
          .from("instancias_evolution")
          .update({
            status: "bloqueado_vencido",
          })
          .eq("cliente_id", cliente.id);

        vencidos++;
        console.log("CLIENTE BLOQUEADO:", cliente.id);
      }
    }

    return NextResponse.json({
      ok: true,
      avisados,
      vencidos,
      clientes_verificados: clientes?.length || 0,
    });
  } catch (error: any) {
    console.log("ERRO CRON:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error: true,
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}