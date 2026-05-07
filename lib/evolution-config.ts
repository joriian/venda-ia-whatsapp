import axios from "axios";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL!;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;

function limparUrl(url: string) {
  return String(url || "").replace(/\/$/, "");
}

function limparTexto(texto: string) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function gerarInstanceName(clienteId: string, servicoSlug?: string) {
  const clienteLimpo = String(clienteId || "").replace(/-/g, "");
  const servicoLimpo = limparTexto(servicoSlug || "servico");

  return `cliente_${clienteLimpo}_${servicoLimpo}`;
}

export async function listarInstanciasEvolution() {
  const response = await axios.get(
    `${limparUrl(EVOLUTION_API_URL)}/instance/fetchInstances`,
    {
      headers: {
        apikey: EVOLUTION_API_KEY,
      },
    }
  );

  return Array.isArray(response.data)
    ? response.data
    : response.data?.instances || [];
}

export async function instanciaExiste(instanceName: string) {
  const instancias = await listarInstanciasEvolution();

  return instancias.some((item: any) => {
    const nome =
      item?.instanceName ||
      item?.instance?.instanceName ||
      item?.name ||
      item?.instance;

    return nome === instanceName;
  });
}

export async function criarInstanciaEvolution(instanceName: string) {
  const existe = await instanciaExiste(instanceName);

  if (existe) {
    return {
      ok: true,
      instanceName,
      jaExistia: true,
    };
  }

  const response = await axios.post(
    `${limparUrl(EVOLUTION_API_URL)}/instance/create`,
    {
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
    },
    {
      headers: {
        apikey: EVOLUTION_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );

  return {
    ok: true,
    instanceName,
    jaExistia: false,
    data: response.data,
  };
}

export async function configurarWebhookEvolution(params: {
  instanceName: string;
  webhookUrl: string;
  enabled?: boolean;
  events?: string[];
  webhookByEvents?: boolean;
  webhookBase64?: boolean;
}) {
  const events =
    params.events && params.events.length > 0
      ? params.events
      : ["MESSAGES_UPSERT", "CONNECTION_UPDATE"];

  const payload = {
    webhook: {
      enabled: params.enabled ?? true,
      url: params.webhookUrl,
      webhook_by_events: params.webhookByEvents ?? false,
      webhook_base64: params.webhookBase64 ?? true,
      events,
    },
  };

  const response = await axios.post(
    `${limparUrl(EVOLUTION_API_URL)}/webhook/set/${params.instanceName}`,
    payload,
    {
      headers: {
        apikey: EVOLUTION_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );

  return {
    ok: true,
    instanceName: params.instanceName,
    payload,
    data: response.data,
  };
}

export async function configurarInstanciaCompleta(params: {
  clienteId: string;
  servicoSlug: string;
  webhookUrl: string;
  events?: string[];
  webhookEnabled?: boolean;
  webhookBase64?: boolean;
}) {
  const instanceName = gerarInstanceName(
    params.clienteId,
    params.servicoSlug
  );

  const instancia = await criarInstanciaEvolution(instanceName);

  const webhook = await configurarWebhookEvolution({
    instanceName,
    webhookUrl: params.webhookUrl,
    enabled: params.webhookEnabled ?? true,
    events: params.events,
    webhookBase64: params.webhookBase64 ?? true,
    webhookByEvents: false,
  });

  return {
    ok: true,
    instanceName,
    instancia,
    webhook,
  };
}