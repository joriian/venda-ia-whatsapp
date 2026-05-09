import axios from "axios";

const EVOLUTION_API_URL = String(
  process.env.EVOLUTION_API_URL || ""
).replace(/\/$/, "");

const EVOLUTION_API_KEY =
  process.env.EVOLUTION_API_KEY || "";

function limparTexto(texto: string) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

export function gerarInstanceName(
  clienteId: string,
  servicoSlug?: string
) {
  const clienteLimpo = String(
    clienteId || ""
  ).replace(/-/g, "");

  const servicoLimpo = limparTexto(
    servicoSlug || "servico"
  );

  return `cliente_${clienteLimpo}_${servicoLimpo}`;
}

export async function listarInstanciasEvolution() {
  try {
    const response = await axios.get(
      `${EVOLUTION_API_URL}/instance/fetchInstances`,
      {
        headers: {
          apikey: EVOLUTION_API_KEY,
        },
      }
    );

    const data = response.data;

    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.instances)) {
      return data.instances;
    }

    return [];
  } catch (error: any) {
    console.log(
      "ERRO LISTAR INSTÂNCIAS:",
      error?.response?.data ||
        error.message
    );

    return [];
  }
}

export async function instanciaExiste(
  instanceName: string
) {
  try {
    const instancias =
      await listarInstanciasEvolution();

    return instancias.some(
      (item: any) => {
        const nome =
          item?.instanceName ||
          item?.instance
            ?.instanceName ||
          item?.instance ||
          item?.name;

        return nome === instanceName;
      }
    );
  } catch {
    return false;
  }
}

export async function obterEstadoInstancia(
  instanceName: string
) {
  try {
    const response = await axios.get(
      `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`,
      {
        headers: {
          apikey:
            EVOLUTION_API_KEY,
        },
      }
    );

    return (
      response.data?.instance
        ?.state ||
      response.data?.state ||
      response.data?.status ||
      "close"
    );
  } catch (error: any) {
    return (
      error?.response?.data ||
      error?.message ||
      "erro"
    );
  }
}

export async function criarInstanciaEvolution(
  instanceName: string
) {
  try {
    const existe =
      await instanciaExiste(
        instanceName
      );

    if (existe) {
      return {
        ok: true,
        instanceName,
        jaExistia: true,
      };
    }

    const response =
      await axios.post(
        `${EVOLUTION_API_URL}/instance/create`,
        {
          instanceName,
          integration:
            "WHATSAPP-BAILEYS",
          qrcode: true,
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

    await sleep(1500);

    return {
      ok: true,
      instanceName,
      jaExistia: false,
      data: response.data,
    };
  } catch (error: any) {
    const texto = JSON.stringify(
      error?.response?.data || ""
    );

    if (
      texto.includes(
        "already exists"
      )
    ) {
      return {
        ok: true,
        instanceName,
        jaExistia: true,
      };
    }

    console.log(
      "ERRO CRIAR INSTÂNCIA:",
      error?.response?.data ||
        error.message
    );

    throw error;
  }
}

export async function removerInstanciaEvolution(
  instanceName: string
) {
  try {
    await axios.delete(
      `${EVOLUTION_API_URL}/instance/delete/${instanceName}`,
      {
        headers: {
          apikey:
            EVOLUTION_API_KEY,
        },
      }
    );

    return {
      ok: true,
    };
  } catch (error: any) {
    console.log(
      "ERRO REMOVER INSTÂNCIA:",
      error?.response?.data ||
        error.message
    );

    return {
      ok: false,
      erro:
        error?.response?.data ||
        error.message,
    };
  }
}

export async function reiniciarInstanciaEvolution(
  instanceName: string
) {
  try {
    const response =
      await axios.put(
        `${EVOLUTION_API_URL}/instance/restart/${instanceName}`,
        {},
        {
          headers: {
            apikey:
              EVOLUTION_API_KEY,
          },
        }
      );

    return {
      ok: true,
      data: response.data,
    };
  } catch (error: any) {
    console.log(
      "ERRO REINICIAR INSTÂNCIA:",
      error?.response?.data ||
        error.message
    );

    return {
      ok: false,
      erro:
        error?.response?.data ||
        error.message,
    };
  }
}

export async function desconectarInstanciaEvolution(
  instanceName: string
) {
  try {
    const response =
      await axios.delete(
        `${EVOLUTION_API_URL}/instance/logout/${instanceName}`,
        {
          headers: {
            apikey:
              EVOLUTION_API_KEY,
          },
        }
      );

    return {
      ok: true,
      data: response.data,
    };
  } catch (error: any) {
    console.log(
      "ERRO DESCONECTAR INSTÂNCIA:",
      error?.response?.data ||
        error.message
    );

    return {
      ok: false,
      erro:
        error?.response?.data ||
        error.message,
    };
  }
}

export async function gerarQrCodeEvolution(
  instanceName: string
) {
  try {
    const response =
      await axios.get(
        `${EVOLUTION_API_URL}/instance/connect/${instanceName}`,
        {
          headers: {
            apikey:
              EVOLUTION_API_KEY,
          },
        }
      );

    const data =
      response.data || {};

    const qr =
      data?.base64 ||
      data?.qrcode ||
      data?.code ||
      data?.qr ||
      data?.data?.base64 ||
      data?.data?.qrcode ||
      data?.qrcode?.base64 ||
      data?.qrcode?.code ||
      null;

    return {
      ok: true,
      qrcode: qr,
      data,
    };
  } catch (error: any) {
    console.log(
      "ERRO QR CODE:",
      error?.response?.data ||
        error.message
    );

    return {
      ok: false,
      erro:
        error?.response?.data ||
        error.message,
    };
  }
}

export async function configurarWebhookEvolution(
  params: {
    instanceName: string;
    webhookUrl: string;
    enabled?: boolean;
    events?: string[];
    webhookByEvents?: boolean;
    webhookBase64?: boolean;
  }
) {
  try {
    const events =
      params.events &&
      params.events.length > 0
        ? params.events
        : [
            "MESSAGES_UPSERT",
            "CONNECTION_UPDATE",
          ];

    const payload = {
      webhook: {
        enabled:
          params.enabled ??
          true,
        url: params.webhookUrl,
        webhook_by_events:
          params.webhookByEvents ??
          false,
        webhook_base64:
          params.webhookBase64 ??
          true,
        events,
      },
    };

    const response =
      await axios.post(
        `${EVOLUTION_API_URL}/webhook/set/${params.instanceName}`,
        payload,
        {
          headers: {
            apikey:
              EVOLUTION_API_KEY,
            "Content-Type":
              "application/json",
          },
        }
      );

    return {
      ok: true,
      instanceName:
        params.instanceName,
      payload,
      data: response.data,
    };
  } catch (error: any) {
    console.log(
      "ERRO CONFIGURAR WEBHOOK:",
      error?.response?.data ||
        error.message
    );

    return {
      ok: false,
      erro:
        error?.response?.data ||
        error.message,
    };
  }
}

export async function configurarInstanciaCompleta(
  params: {
    clienteId: string;
    servicoSlug: string;
    webhookUrl: string;
    events?: string[];
    webhookEnabled?: boolean;
    webhookBase64?: boolean;
  }
) {
  const instanceName =
    gerarInstanceName(
      params.clienteId,
      params.servicoSlug
    );

  const instancia =
    await criarInstanciaEvolution(
      instanceName
    );

  await sleep(1500);

  const webhook =
    await configurarWebhookEvolution(
      {
        instanceName,
        webhookUrl:
          params.webhookUrl,
        enabled:
          params.webhookEnabled ??
          true,
        events: params.events,
        webhookBase64:
          params.webhookBase64 ??
          true,
        webhookByEvents: false,
      }
    );

  return {
    ok: true,
    instanceName,
    instancia,
    webhook,
  };
}