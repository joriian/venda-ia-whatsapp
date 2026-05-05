import { NextResponse } from "next/server";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  try {
    const { clienteId } = await req.json();

    if (!clienteId) {
      return NextResponse.json({ error: "clienteId obrigatório" }, { status: 400 });
    }

    const { data: instancia } = await supabase
      .from("instancias_evolution")
      .select("*")
      .eq("cliente_id", clienteId)
      .single();

    if (!instancia) {
      return NextResponse.json({ error: "Instância não encontrada" }, { status: 404 });
    }

    const instanceName = instancia.instance_name;

    // 🔥 INICIA CONEXÃO
    await axios.get(
      `${process.env.EVOLUTION_API_URL}/instance/connect/${instanceName}`,
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
        },
      }
    );

    let base64 = null;

    // 🔥 TENTA PEGAR QR POR 10 VEZES
    for (let i = 0; i < 10; i++) {
      const response = await axios.get(
        `${process.env.EVOLUTION_API_URL}/instance/qrcode/${instanceName}`,
        {
          headers: {
            apikey: process.env.EVOLUTION_API_KEY!,
          },
        }
      );

      const data = response.data;

      console.log(`Tentativa ${i + 1}:`, data);

      base64 =
        data?.base64 ||
        data?.qrcode?.base64 ||
        data?.qrcode ||
        data?.qr;

      if (base64 && base64 !== true) {
        break;
      }

      await sleep(2000); // espera 2s
    }

    if (!base64 || base64 === true) {
      return NextResponse.json({
        error: "QR não gerado ainda, tente novamente",
      });
    }

    if (!base64.startsWith("data:image")) {
      base64 = `data:image/png;base64,${base64}`;
    }

    return NextResponse.json({
      qrcode: base64,
      instanceName,
    });
  } catch (error: any) {
    console.log("ERRO QR:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error: "Erro ao gerar QR Code",
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}