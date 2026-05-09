import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EVOLUTION_API_URL = String(
  process.env.EVOLUTION_API_URL || ""
).replace(/\/$/, "");

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;

async function validarCliente(token: string) {
  const { data: cliente } = await supabase
    .from("clientes_ia_whatsapp")
    .select("*")
    .eq("session_token", token)
    .maybeSingle();

  if (!cliente) return null;

  const expira = cliente.session_expires_at
    ? new Date(cliente.session_expires_at)
    : null;

  if (!expira || expira < new Date()) {
    return null;
  }

  return cliente;
}

async function buscarServicoDoCliente(
  clienteId: string,
  clienteServicoId: string
) {
  const { data } = await supabase
    .from("cliente_servicos")
    .select(`
      *,
      servicos_ia (*),
      planos (*)
    `)
    .eq("id", clienteServicoId)
    .eq("cliente_id", clienteId)
    .maybeSingle();

  return data;
}

function pegarQrCode(data: any) {
  return (
    data?.base64 ||
    data?.qrcode?.base64 ||
    data?.qrcode ||
    data?.code ||
    data?.qr ||
    data?.data?.base64 ||
    data?.data?.qrcode ||
    data?.qrcode?.code ||
    ""
  );
}

function statusConectado(status: string) {
  const s = String(status || "").toLowerCase();

  return (
    s === "open" ||
    s === "connected" ||
    s === "conectado"
  );
}

async function salvarStatus(params: {
  clienteId: string;
  clienteServicoId: string;
  servicoId: string;
  instanceName: string;
  status: string;
  qrcode?: string | null;
  numero?: string | null;
  nome?: string | null;
}) {
  await supabase
    .from("cliente_servicos")
    .update({
      instance_name: params.instanceName,
      evolution_status: params.status,
      evolution_qrcode: params.qrcode || null,
      evolution_numero: params.numero || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.clienteServicoId);

  await supabase
    .from("evolution_qrcodes")
    .upsert(
      {
        cliente_id: params.clienteId,
        servico_id: params.servicoId,
        cliente_servico_id: params.clienteServicoId,
        instance_name: params.instanceName,
        qrcode: params.qrcode || null,
        status: params.status,
        numero: params.numero || null,
        nome: params.nome || null,
        atualizado_em: new Date().toISOString(),
      },
      {
        onConflict: "instance_name",
      }
    );

  await supabase
    .from("instancias_evolution")
    .upsert(
      {
        cliente_id: params.clienteId,
        servico_id: params.servicoId,
        cliente_servico_id: params.clienteServicoId,
        instance_name: params.instanceName,
        status: params.status,
        numero: params.numero || null,
        nome: params.nome || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "cliente_id,servico_id",
      }
    );
}

async function consultarStatus(instanceName: string) {
  const response = await axios.get(
    `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`,
    {
      headers: {
        apikey: EVOLUTION_API_KEY,
      },
    }
  );

  const status =
    response.data?.instance?.state ||
    response.data?.state ||
    response.data?.status ||
    "connecting";

  return {
    status,
    data: response.data,
  };
}

async function gerarQrCode(instanceName: string) {
  try {
    const response = await axios.get(
      `${EVOLUTION_API_URL}/instance/connect/${instanceName}`,
      {
        headers: {
          apikey: EVOLUTION_API_KEY,
        },
      }
    );

    console.log("EVOLUTION CONNECT:", response.data);

    const qr = pegarQrCode(response.data);

    return {
      qrcode: qr,
      data: response.data,
    };
  } catch (error: any) {
    console.log(
      "ERRO AO GERAR QR:",
      error.response?.data || error.message
    );

    throw error;
  }
}

async function reiniciarInstancia(instanceName: string) {
  const response = await axios.put(
    `${EVOLUTION_API_URL}/instance/restart/${instanceName}`,
    {},
    {
      headers: {
        apikey: EVOLUTION_API_KEY,
      },
    }
  );

  return response.data;
}

async function desconectarInstancia(instanceName: string) {
  const response = await axios.delete(
    `${EVOLUTION_API_URL}/instance/logout/${instanceName}`,
    {
      headers: {
        apikey: EVOLUTION_API_KEY,
      },
    }
  );

  return response.data;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const token = body.token;
    const clienteServicoId = body.cliente_servico_id;
    const acao = body.acao;

    if (!token) {
      return NextResponse.json(
        {
          error: "Token obrigatório",
        },
        {
          status: 401,
        }
      );
    }

    if (!clienteServicoId) {
      return NextResponse.json(
        {
          error: "Serviço obrigatório",
        },
        {
          status: 400,
        }
      );
    }

    const cliente = await validarCliente(token);

    if (!cliente) {
      return NextResponse.json(
        {
          error: "Sessão inválida",
        },
        {
          status: 401,
        }
      );
    }

    const servicoCliente =
      await buscarServicoDoCliente(
        cliente.id,
        clienteServicoId
      );

    if (!servicoCliente) {
      return NextResponse.json(
        {
          error: "Serviço não encontrado",
        },
        {
          status: 404,
        }
      );
    }

    const instanceName =
      servicoCliente.instance_name;

    if (!instanceName) {
      return NextResponse.json(
        {
          error:
            "Instância não encontrada para este serviço",
        },
        {
          status: 400,
        }
      );
    }

    if (acao === "status") {
      const status = await consultarStatus(
        instanceName
      );

      await salvarStatus({
        clienteId: cliente.id,
        clienteServicoId: servicoCliente.id,
        servicoId: servicoCliente.servico_id,
        instanceName,
        status: status.status,
      });

      return NextResponse.json({
        ok: true,
        acao,
        instanceName,
        status: status.status,
        conectado: statusConectado(
          status.status
        ),
        data: status.data,
      });
    }

    if (acao === "qrcode") {
      const qr = await gerarQrCode(
        instanceName
      );

      await salvarStatus({
        clienteId: cliente.id,
        clienteServicoId: servicoCliente.id,
        servicoId: servicoCliente.servico_id,
        instanceName,
        status: "qrcode",
        qrcode: qr.qrcode || null,
      });

      return NextResponse.json({
        ok: true,
        acao,
        instanceName,
        status: "qrcode",
        qrcode: qr.qrcode || null,
        data: qr.data,
      });
    }

    if (acao === "reiniciar") {
      const data = await reiniciarInstancia(
        instanceName
      );

      await salvarStatus({
        clienteId: cliente.id,
        clienteServicoId: servicoCliente.id,
        servicoId: servicoCliente.servico_id,
        instanceName,
        status: "connecting",
      });

      return NextResponse.json({
        ok: true,
        acao,
        instanceName,
        status: "connecting",
        data,
      });
    }

    if (acao === "desconectar") {
      const data =
        await desconectarInstancia(
          instanceName
        );

      await salvarStatus({
        clienteId: cliente.id,
        clienteServicoId: servicoCliente.id,
        servicoId: servicoCliente.servico_id,
        instanceName,
        status: "close",
        qrcode: null,
      });

      return NextResponse.json({
        ok: true,
        acao,
        instanceName,
        status: "close",
        data,
      });
    }

    return NextResponse.json(
      {
        error: "Ação inválida",
      },
      {
        status: 400,
      }
    );
  } catch (error: any) {
    console.log(
      "ERRO CLIENTE EVOLUTION:",
      error.response?.data || error.message
    );

    return NextResponse.json(
      {
        error: "Erro ao controlar instância",
        detalhe:
          error.response?.data ||
          error.message,
      },
      {
        status: 500,
      }
    );
  }
}