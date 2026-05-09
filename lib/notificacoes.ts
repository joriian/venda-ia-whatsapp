import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EVOLUTION_API_URL = String(
  process.env.EVOLUTION_API_URL || ""
).replace(/\/$/, "");

const EVOLUTION_API_KEY =
  process.env.EVOLUTION_API_KEY!;

function limparNumero(
  numero: string
) {
  return String(numero || "").replace(
    /\D/g,
    ""
  );
}

function formatarNumero(
  numero: string
) {
  const n = limparNumero(numero);

  if (!n) return "";

  if (n.startsWith("55")) {
    return n;
  }

  return `55${n}`;
}

async function buscarInstanciaSistema() {
  const fixa =
    process.env
      .EVOLUTION_NOTIFY_INSTANCE ||
    process.env
      .EVOLUTION_DEFAULT_INSTANCE;

  if (fixa) return fixa;

  const { data } = await supabase
    .from("instancias_evolution")
    .select(
      "instance_name,status"
    )
    .in("status", [
      "open",
      "connected",
      "conectado",
    ])
    .limit(1)
    .maybeSingle();

  return (
    data?.instance_name || null
  );
}

export async function criarNotificacao(
  params: {
    tipo: string;
    titulo: string;
    mensagem: string;

    cliente_id?: string | null;
    cliente_servico_id?:
      | string
      | null;
    instancia_id?: string | null;

    nivel?:
      | "info"
      | "warning"
      | "error"
      | "success";

    metadata?: any;
  }
) {
  const chaveDuplicada =
    `${params.tipo}_${params.cliente_id}_${params.cliente_servico_id}_${params.titulo}`;

  const { data: existente } =
    await supabase
      .from(
        "notificacoes_sistema"
      )
      .select("id,created_at")
      .eq("tipo", params.tipo)
      .eq(
        "cliente_id",
        params.cliente_id || null
      )
      .eq(
        "cliente_servico_id",
        params.cliente_servico_id ||
          null
      )
      .eq("titulo", params.titulo)
      .gte(
        "created_at",
        new Date(
          Date.now() -
            5 * 60 * 1000
        ).toISOString()
      )
      .limit(1)
      .maybeSingle();

  if (existente?.id) {
    return existente;
  }

  const { data, error } =
    await supabase
      .from(
        "notificacoes_sistema"
      )
      .insert({
        tipo: params.tipo,
        titulo: params.titulo,
        mensagem: params.mensagem,

        cliente_id:
          params.cliente_id ||
          null,

        cliente_servico_id:
          params.cliente_servico_id ||
          null,

        instancia_id:
          params.instancia_id ||
          null,

        nivel:
          params.nivel ||
          "info",

        metadata: {
          ...(params.metadata ||
            {}),
          chave_duplicada:
            chaveDuplicada,
        },
      })
      .select()
      .single();

  if (error) {
    console.log(
      "ERRO CRIAR NOTIFICAÇÃO:",
      error.message
    );

    return null;
  }

  return data;
}

export async function enviarWhatsappNotificacao(
  params: {
    telefone: string;
    mensagem: string;
  }
) {
  try {
    const instanceName =
      await buscarInstanciaSistema();

    if (!instanceName) {
      console.log(
        "SEM INSTÂNCIA PARA NOTIFICAÇÃO"
      );

      return false;
    }

    const numero =
      formatarNumero(
        params.telefone
      );

    if (!numero) {
      console.log(
        "NÚMERO INVÁLIDO"
      );

      return false;
    }

    const url =
      `${EVOLUTION_API_URL}/message/sendText/${instanceName}`;

    await axios.post(
      url,
      {
        number: numero,
        text: params.mensagem,
      },
      {
        headers: {
          apikey:
            EVOLUTION_API_KEY,
          "Content-Type":
            "application/json",
        },
      }
    );

    return true;
  } catch (error: any) {
    console.log(
      "ERRO WHATSAPP:",
      error?.response?.data ||
        error.message
    );

    return false;
  }
}

export async function notificarPagamentoAprovado(
  params: {
    cliente_id: string;
    cliente_servico_id: string;
  }
) {
  try {
    const { data: vinculo } =
      await supabase
        .from(
          "cliente_servicos"
        )
        .select(
          `
        *,
        clientes_ia_whatsapp (
          id,
          nome,
          telefone
        ),
        servicos_ia (
          nome
        ),
        planos (
          nome
        )
      `
        )
        .eq(
          "id",
          params.cliente_servico_id
        )
        .maybeSingle();

    if (!vinculo) return;

    const cliente: any =
      vinculo.clientes_ia_whatsapp;

    const servico: any =
      vinculo.servicos_ia;

    const plano: any =
      vinculo.planos;

    const titulo =
      "Pagamento aprovado";

    const mensagem =
      `Seu pagamento foi aprovado com sucesso.\n\n` +
      `Serviço: ${
        servico?.nome || "-"
      }\n` +
      `Plano: ${
        plano?.nome || "-"
      }\n\n` +
      `Seu acesso já foi liberado.`;

    await criarNotificacao({
      tipo:
        "pagamento_aprovado",
      titulo,
      mensagem,
      cliente_id:
        cliente?.id,
      cliente_servico_id:
        vinculo.id,
      nivel: "success",
    });

    if (cliente?.telefone) {
      await enviarWhatsappNotificacao(
        {
          telefone:
            cliente.telefone,
          mensagem,
        }
      );
    }
  } catch (error: any) {
    console.log(
      "ERRO PAGAMENTO APROVADO:",
      error?.response?.data ||
        error.message
    );
  }
}

export async function notificarInstanciaDesconectada(
  params: {
    cliente_id?: string | null;
    cliente_servico_id?:
      | string
      | null;
    telefone?: string | null;
    instance_name: string;
  }
) {
  try {
    const titulo =
      "WhatsApp desconectado";

    const mensagem =
      `Seu WhatsApp foi desconectado.\n\n` +
      `Instância: ${params.instance_name}\n\n` +
      `Conecte novamente para evitar interrupções na automação.`;

    await criarNotificacao({
      tipo:
        "instancia_desconectada",
      titulo,
      mensagem,
      cliente_id:
        params.cliente_id ||
        null,
      cliente_servico_id:
        params.cliente_servico_id ||
        null,
      nivel: "warning",
      metadata: {
        instance_name:
          params.instance_name,
      },
    });

    if (params.telefone) {
      await enviarWhatsappNotificacao(
        {
          telefone:
            params.telefone,
          mensagem,
        }
      );
    }
  } catch (error: any) {
    console.log(
      "ERRO INSTÂNCIA:",
      error?.response?.data ||
        error.message
    );
  }
}

export async function notificarErroN8n(
  params: {
    cliente_id?: string | null;
    cliente_servico_id?:
      | string
      | null;
    telefone?: string | null;
    erro: string;
    instance_name?: string;
  }
) {
  try {
    const titulo =
      "Erro na automação";

    const mensagem =
      `Foi detectado um erro na automação.\n\n` +
      `Erro: ${params.erro}\n\n` +
      `Instância: ${
        params.instance_name ||
        "-"
      }`;

    await criarNotificacao({
      tipo: "erro_n8n",
      titulo,
      mensagem,
      cliente_id:
        params.cliente_id ||
        null,
      cliente_servico_id:
        params.cliente_servico_id ||
        null,
      nivel: "error",
      metadata: {
        erro: params.erro,
        instance_name:
          params.instance_name,
      },
    });

    if (params.telefone) {
      await enviarWhatsappNotificacao(
        {
          telefone:
            params.telefone,
          mensagem,
        }
      );
    }
  } catch (error: any) {
    console.log(
      "ERRO N8N:",
      error?.response?.data ||
        error.message
    );
  }
}