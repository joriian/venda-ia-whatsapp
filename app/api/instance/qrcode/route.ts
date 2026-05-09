import { NextResponse } from "next/server";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API = process.env.EVOLUTION_API_URL!;
const KEY = process.env.EVOLUTION_API_KEY!;

export async function POST(req: Request) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) {
      return NextResponse.json(
        {
          error: "InstanceName obrigatório",
        },
        { status: 400 }
      );
    }

    console.log(
      "BUSCANDO QR CODE:",
      instanceName
    );

    // força gerar qr
    const connectResponse =
      await axios.get(
        `${API}/instance/connect/${instanceName}`,
        {
          headers: {
            apikey: KEY,
          },
        }
      );

    console.log(
      "CONNECT RESPONSE:",
      connectResponse.data
    );

    let qr =
      connectResponse.data?.base64 ||
      connectResponse.data?.qrcode ||
      connectResponse.data?.code ||
      connectResponse.data?.qr ||
      null;

    // fallback fetchInstances
    if (!qr) {
      const instances =
        await axios.get(
          `${API}/instance/fetchInstances`,
          {
            headers: {
              apikey: KEY,
            },
          }
        );

      const lista = Array.isArray(
        instances.data
      )
        ? instances.data
        : instances.data?.instances ||
          [];

      const instancia =
        lista.find((i: any) => {
          return (
            i.name === instanceName ||
            i.instanceName ===
              instanceName
          );
        });

      qr =
        instancia?.qrcode ||
        instancia?.base64 ||
        null;
    }

    if (!qr) {
      return NextResponse.json(
        {
          error:
            "QR Code ainda não disponível",
        },
        { status: 404 }
      );
    }

    // adiciona prefixo se necessário
    if (
      !String(qr).startsWith(
        "data:image"
      )
    ) {
      qr = `data:image/png;base64,${qr}`;
    }

    // salva no banco
    await supabase
      .from("evolution_qrcodes")
      .upsert(
        {
          instance_name:
            instanceName,
          qrcode: qr,
          status: "connecting",
          atualizado_em:
            new Date().toISOString(),
        },
        {
          onConflict:
            "instance_name",
        }
      );

    await supabase
      .from("cliente_servicos")
      .update({
        evolution_qrcode: qr,
        evolution_status:
          "connecting",
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "instance_name",
        instanceName
      );

    return NextResponse.json({
      ok: true,
      qrcode: qr,
    });
  } catch (error: any) {
    console.log(
      "ERRO QR:",
      error.response?.data ||
        error.message
    );

    return NextResponse.json(
      {
        error: true,
        detalhe:
          error.response?.data ||
          error.message,
      },
      { status: 500 }
    );
  }
}