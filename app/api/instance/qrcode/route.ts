import { NextResponse } from "next/server";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    await axios.post(
      `${process.env.EVOLUTION_API_URL}/instance/connect/${instanceName}`,
      {},
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
        },
      }
    );

    // 🔥 ESPERA UM POUCO (ESSENCIAL)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 🔥 PEGA QR
    const response = await axios.get(
      `${process.env.EVOLUTION_API_URL}/instance/qrcode/${instanceName}`,
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
        },
      }
    );

    const data = response.data;

    console.log("QR RAW:", data);

    // 🔥 TRATA TODOS OS FORMATOS POSSÍVEIS
    let base64 =
      data?.base64 ||
      data?.qrcode?.base64 ||
      data?.qr ||
      data?.qrcode;

    if (!base64) {
      return NextResponse.json({
        error: "QR ainda não disponível, tente novamente",
      });
    }

    // 🔥 GARANTE FORMATO IMG
    if (!base64.startsWith("data:image")) {
      base64 = `data:image/png;base64,${base64}`;
    }

    return NextResponse.json({
      qrcode: base64,
    });
  } catch (error: any) {
    console.log("ERRO QR:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error: true,
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}