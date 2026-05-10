import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "NEXORA_SECRET_2026";

const EVOLUTION_API_URL = String(
  process.env.EVOLUTION_API_URL || ""
).replace(/\/$/, "");

const EVOLUTION_API_KEY =
  process.env.EVOLUTION_API_KEY!;

async function validarCliente(
  token: string
) {
  try {
    const decoded: any =
      jwt.verify(
        token,
        JWT_SECRET
      );

    if (
      decoded?.id &&
      decoded?.tipo ===
        "cliente"
    ) {
      const { data } =
        await supabase
          .from(
            "clientes_ia_whatsapp"
          )
          .select("*")
          .eq(
            "id",
            decoded.id
          )
          .maybeSingle();

      if (data)
        return data;
    }
  } catch {}

  const { data } =
    await supabase
      .from(
        "clientes_ia_whatsapp"
      )
      .select("*")
      .eq(
        "session_token",
        token
      )
      .maybeSingle();

  return data || null;
}

function pegarQr(data: any) {
  return (
    data?.base64 ||
    data?.qrcode ||
    data?.qr ||
    data?.code ||
    data?.data?.base64 ||
    data?.data?.qrcode ||
    data?.qrcode?.base64 ||
    data?.qrcode?.code ||
    null
  );
}

function formatarQr(qr: any) {
  if (!qr) return null;

  const texto = String(qr);

  if (
    texto.startsWith(
      "data:image"
    )
  ) {
    return texto;
  }

  return `data:image/png;base64,${texto}`;
}

function erroTexto(error: any) {
  const detalhe =
    error?.response?.data ||
    error?.message ||
    error;

  if (
    typeof detalhe ===
    "string"
  )
    return detalhe;

  try {
    return JSON.stringify(
      detalhe
    );
  } catch {
    return "Erro desconhecido";
  }
}

async function salvarQrCode(
  clienteServico: any,
  qr: string | null,
  status: string
) {
  await supabase
    .from(
      "cliente_servicos"
    )
    .update({
      evolution_qrcode:
        qr,
      evolution_status:
        status,
      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      clienteServico.id
    );
}

async function criarInstanciaSeNecessario(
  instanceName: string
) {
  try {
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
  } catch (error: any) {
    const texto =
      erroTexto(
        error
      ).toLowerCase();

    if (
      texto.includes(
        "already"
      ) ||
      texto.includes(
        "exist"
      ) ||
      error.response
        ?.status === 409
    ) {
      return;
    }

    throw error;
  }
}

export async function POST(
  req: Request
) {
  try {
    const body =
      await req.json();

    const token =
      body.token ||
      req.headers.get(
        "x-cliente-token"
      ) ||
      req.headers
        .get(
          "authorization"
        )
        ?.replace(
          "Bearer ",
          ""
        );

    const acao =
      body.acao;

    const clienteServicoId =
      body.cliente_servico_id;

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Token obrigatório",
        },
        { status: 401 }
      );
    }

    const cliente =
      await validarCliente(
        token
      );

    if (!cliente) {
      return NextResponse.json(
        {
          error:
            "Sessão inválida",
        },
        { status: 401 }
      );
    }

    const {
      data:
        clienteServico,
    } = await supabase
      .from(
        "cliente_servicos"
      )
      .select("*")
      .eq(
        "id",
        clienteServicoId
      )
      .eq(
        "cliente_id",
        cliente.id
      )
      .maybeSingle();

    if (!clienteServico) {
      return NextResponse.json(
        {
          error:
            "Serviço não encontrado",
        },
        { status: 404 }
      );
    }

    /*
      BLOQUEIO PRINCIPAL
    */

    const statusPagamento =
      String(
        clienteServico.status ||
          ""
      ).toLowerCase();

    const pagamentoOk =
      [
        "ativo",
        "approved",
        "aprovado",
        "pago",
      ].includes(
        statusPagamento
      );

    if (!pagamentoOk) {
      return NextResponse.json(
        {
          error:
            "Pagamento ainda não aprovado.",
        },
        { status: 403 }
      );
    }

    if (
      !clienteServico.instance_name
    ) {
      return NextResponse.json(
        {
          error:
            "Instância não configurada",
        },
        { status: 400 }
      );
    }

    const instanceName =
      clienteServico.instance_name;

    /*
      CRIA INSTÂNCIA
      SOMENTE APÓS PAGAMENTO
    */

    await criarInstanciaSeNecessario(
      instanceName
    );

    if (
      acao ===
      "qrcode"
    ) {
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

      const qr =
        formatarQr(
          pegarQr(
            response.data
          )
        );

      await salvarQrCode(
        clienteServico,
        qr,
        qr
          ? "qrcode"
          : "connecting"
      );

      return NextResponse.json(
        {
          ok: true,
          status: qr
            ? "qrcode"
            : "connecting",
          qrcode: qr,
        }
      );
    }

    if (
      acao ===
      "status"
    ) {
      const response =
        await axios.get(
          `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`,
          {
            headers: {
              apikey:
                EVOLUTION_API_KEY,
            },
          }
        );

      const status =
        response.data
          ?.instance
          ?.state ||
        response.data
          ?.state ||
        response.data
          ?.status ||
        "close";

      await salvarQrCode(
        clienteServico,
        clienteServico.evolution_qrcode ||
          null,
        status
      );

      return NextResponse.json(
        {
          ok: true,
          status,
        }
      );
    }

    if (
      acao ===
      "reiniciar"
    ) {
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

      await salvarQrCode(
        clienteServico,
        null,
        "connecting"
      );

      return NextResponse.json(
        {
          ok: true,
          status:
            "connecting",
        }
      );
    }

    if (
      acao ===
      "desconectar"
    ) {
      await axios.delete(
        `${EVOLUTION_API_URL}/instance/logout/${instanceName}`,
        {
          headers: {
            apikey:
              EVOLUTION_API_KEY,
          },
        }
      );

      await salvarQrCode(
        clienteServico,
        null,
        "close"
      );

      return NextResponse.json(
        {
          ok: true,
          status:
            "close",
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Ação inválida",
      },
      { status: 400 }
    );
  } catch (error: any) {
    const detalhe =
      erroTexto(error);

    console.log(
      "ERRO CLIENTE EVOLUTION:",
      detalhe
    );

    return NextResponse.json(
      {
        error:
          "Erro ao controlar WhatsApp",
        detalhe,
      },
      { status: 500 }
    );
  }
}