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

    const { data } = await axios.get(
      `${process.env.EVOLUTION_API_URL}/instance/connect/${instanceName}`,
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
          Authorization: `Bearer ${process.env.EVOLUTION_API_KEY!}`,
        },
      }
    );

    console.log("QR RAW:", data);

    let base64 =
      data?.base64 ||
      data?.qrcode?.base64 ||
      data?.qrcode ||
      data?.qr;

    if (!base64 || base64 === true) {
      return NextResponse.json({
        error: "QR ainda não disponível, clique novamente em alguns segundos",
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