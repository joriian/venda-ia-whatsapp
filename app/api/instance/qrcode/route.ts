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

    const { data: instancia } = await supabase
      .from("instancias_evolution")
      .select("*")
      .eq("cliente_id", clienteId)
      .single();

    if (!instancia) {
      return NextResponse.json({ error: "Instância não encontrada" }, { status: 404 });
    }

    const instanceName = instancia.instance_name;

    // 🔥 PEGA STATUS DA INSTÂNCIA
    const { data } = await axios.get(
      `${process.env.EVOLUTION_API_URL}/instance/fetchInstances`,
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
        },
      }
    );

    const instance = data.find(
      (i: any) => i.instanceName === instanceName
    );

    if (!instance) {
      return NextResponse.json({
        error: "Instância não encontrada na Evolution",
      });
    }

    // 🔥 SE JÁ ESTÁ CONECTADO
    if (instance.state === "open") {
      return NextResponse.json({
        conectado: true,
        numero: instance.owner || null,
      });
    }

    // 🔥 SE NÃO ESTÁ CONECTADO → PEGA QR
    if (instance.qrcode) {
      let base64 = instance.qrcode;

      if (!base64.startsWith("data:image")) {
        base64 = `data:image/png;base64,${base64}`;
      }

      return NextResponse.json({
        qrcode: base64,
      });
    }

    return NextResponse.json({
      error: "QR ainda não disponível",
    });
  } catch (error: any) {
    console.log("ERRO QR:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error: "Erro ao buscar status",
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}