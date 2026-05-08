import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import {
  criarNotificacao,
  enviarWhatsappNotificacao,
} from "@/lib/notificacoes";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EVOLUTION_API_URL = String(process.env.EVOLUTION_API_URL || "").replace(
  /\/$/,
  ""
);

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;

function estaOnline(status: string) {
  const s = String(status || "").toLowerCase();
  return s === "open" || s === "connected" || s === "conectado";
}

function chaveInstancia(instanceName: string) {
  const hoje = new Date().toISOString().slice(0, 10);
  return `instancia_desconectada_${instanceName}_${hoje}`;
}

async function notificacaoJaExiste(chave: string) {
  const { data } = await supabase
    .from("notificacoes_sistema")
    .select("id")
    .eq("chave_unica", chave)
    .maybeSingle();

  return Boolean(data);
}

async function consultarStatusEvolution(instanceName: string) {
  const response = await axios.get(
    `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`,
    {
      headers: {
        apikey: EVOLUTION_API_KEY,
      },
    }
  );

  return (
    response.data?.instance?.state ||
    response.data?.state ||
    response.data?.status ||
    "unknown"
  );
}

export async function GET() {
  try {
    const { data: instancias, error } = await supabase
      .from("instancias_evolution")
      .select(`
        *,
        clientes_ia_whatsapp (
          id,
          nome,
          telefone
        )
      `);

    if (error) {
      throw new Error(error.message);
    }

    const processadas: any[] = [];

    for (const instancia of instancias || []) {
      if (!instancia.instance_name) continue;

      let status = instancia.status || "unknown";

      try {
        status = await consultarStatusEvolution(instancia.instance_name);
      } catch (error: any) {
        status = "offline";
      }

      await supabase
        .from("instancias_evolution")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", instancia.id);

      if (estaOnline(status)) {
        continue;
      }

      const chave = chaveInstancia(instancia.instance_name);

      const existe = await notificacaoJaExiste(chave);

      if (existe) {
        continue;
      }

      const cliente: any = instancia.clientes_ia_whatsapp;

      const titulo = "Instância desconectada";
      const mensagem =
        `A instância de WhatsApp está desconectada.\n\n` +
        `Cliente: ${cliente?.nome || "-"}\n` +
        `Instância: ${instancia.instance_name}\n\n` +
        `Reconecte para evitar parada da automação.`;

      await criarNotificacao({
        tipo: "instancia_desconectada",
        titulo,
        mensagem,
        cliente_id: instancia.cliente_id,
        cliente_servico_id: instancia.cliente_servico_id,
        instancia_id: instancia.id,
        nivel: "error",
        metadata: {
          instance_name: instancia.instance_name,
          status,
        },
        chave_unica: chave,
      } as any);

      if (cliente?.telefone) {
        await enviarWhatsappNotificacao({
          telefone: cliente.telefone,
          mensagem,
        });
      }

      processadas.push({
        instance_name: instancia.instance_name,
        status,
        cliente: cliente?.nome || null,
      });
    }

    return NextResponse.json({
      ok: true,
      total: processadas.length,
      processadas,
    });
  } catch (error: any) {
    console.log(
      "ERRO VERIFICAR INSTÂNCIAS:",
      error.response?.data || error.message
    );

    return NextResponse.json(
      {
        error: "Erro ao verificar instâncias",
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}