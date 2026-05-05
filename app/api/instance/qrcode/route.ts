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
      return NextResponse.json(
        { error: "clienteId obrigatório" },
        { status: 400 }
      );
    }

    const { data: instancia } = await supabase
      .from("instancias_evolution")
      .select("*")
      .eq("cliente_id", clienteId)
      .single();

    if (!instancia) {
      return NextResponse.json(
        { error: "Instância não encontrada" },
        { status: 404 }
      );
    }

    const instanceName = instancia.instance_name;

    // 🔥 FORÇA CONEXÃO
    await axios.post(
      `${process.env.EVOLUTION_API_URL}/instance/connect/${instanceName}`,
      {},
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
        },
      }
    );

    // 🔥 PEGA QR
    const { data } = await axios.get(
      `${process.env.EVOLUTION_API_URL}/instance/qrcode/${instanceName}`,
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
        },
      }
    );

    if (!data?.base64) {
      return NextResponse.json({
        error: "QR ainda não gerado",
      });
    }

    return NextResponse.json({
      qrcode: data.base64,
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