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

async function validarCliente(token: string) {
  try {
    const decoded: any = jwt.verify(
      token,
      JWT_SECRET
    );

    if (
      !decoded?.id ||
      decoded?.tipo !== "cliente"
    ) {
      return null;
    }

    const { data: cliente } =
      await supabase
        .from("clientes_ia_whatsapp")
        .select("*")
        .eq("id", decoded.id)
        .maybeSingle();

    return cliente || null;
  } catch {
    return null;
  }
}

function pegarQr(data: any) {
  return (
    data?.base64 ||
    data?.qrcode ||
    data?.code ||
    data?.qr ||
    data?.data?.base64 ||
    data?.data?.qrcode ||
    data?.qrcode?.base64 ||
    null
  );
}

async function salvarQrCode(
  clienteServico: any,
  qr: string | null,
  status: string
) {
  await supabase
    .from("cliente_servicos")
    .update({
      evolution_qrcode: qr,
      evolution_status: status,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", clienteServico.id);

  await supabase
    .from("evolution_qrcodes")
    .upsert(
      {
        cliente_id:
          clienteServico.cliente_id,
        servico_id:
          clienteServico.servico_id,
        cliente_servico_id:
          clienteServico.id,
        instance_name:
          clienteServico.instance_name,
        qrcode: qr,
        status,
        atualizado_em:
          new Date().toISOString(),
      },
      {
        onConflict: "instance_name",
      }
    );

  await supabase
    .from("instancias_evolution")
    .upsert(
      {
        cliente_id:
          clienteServico.cliente_id,
        servico_id:
          clienteServico.servico_id,
        instance_name:
          clienteServico.instance_name,
        qrcode: qr,
        status,
        criado_em:
          new Date().toISOString(),
      },
      {
        onConflict: "instance_name",
      }
    );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const token = body.token;
    const acao = body.acao;
    const clienteServicoId =
      body.cliente_servico_id;

    if (!token) {
      return NextResponse.json(
        {
          error: "Token obrigatório",
        },
        { status: 401 }
      );
    }

    const cliente =
      await validarCliente(token);

    if (!cliente) {
      return NextResponse.json(
        {
          error: "Sessão inválida",
        },
        { status: 401 }
      );
    }

    const { data: clienteServico } =
      await supabase
        .from("cliente_servicos")
        .select("*")
        .eq("id", clienteServicoId)
        .eq("cliente_id", cliente.id)
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

    const instanceName =
      clienteServico.instance_name;

    if (!instanceName) {
      return NextResponse.json(
        {
          error:
            "Instância não configurada",
        },
        { status: 400 }
      );
    }

    // GERAR QR CODE
    if (
      acao === "qrcode" ||
      acao === "novo_qrcode"
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

      console.log(
        "QR EVOLUTION:",
        response.data
      );

      let qr = pegarQr(
        response.data
      );

      if (
        qr &&
        !String(qr).startsWith(
          "data:image"
        )
      ) {
        qr = `data:image/png;base64,${qr}`;
      }

      await salvarQrCode(
        clienteServico,
        qr,
        "connecting"
      );

      return NextResponse.json({
        ok: true,
        status: "connecting",
        qrcode: qr,
      });
    }

    // STATUS
    if (acao === "status") {
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
        response.data?.instance
          ?.state ||
        response.data?.state ||
        "close";

      await salvarQrCode(
        clienteServico,
        clienteServico.evolution_qrcode,
        status
      );

      return NextResponse.json({
        ok: true,
        status,
      });
    }

    // REINICIAR
    if (acao === "reiniciar") {
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

      return NextResponse.json({
        ok: true,
      });
    }

    // DESCONECTAR
    if (acao === "desconectar") {
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

      return NextResponse.json({
        ok: true,
      });
    }

    return NextResponse.json(
      {
        error: "Ação inválida",
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.log(
      "ERRO EVOLUTION:",
      error.response?.data ||
        error.message
    );

    return NextResponse.json(
      {
        error:
          "Erro ao controlar WhatsApp",
        detalhe:
          error.response?.data ||
          error.message,
      },
      { status: 500 }
    );
  }
}