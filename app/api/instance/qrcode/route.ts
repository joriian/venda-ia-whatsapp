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
      return NextResponse.json({ error: "Instância não encontrada no banco" }, { status: 404 });
    }

    const instanceName = instancia.instance_name;

    const { data } = await axios.get(
      `${process.env.EVOLUTION_API_URL}/instance/fetchInstances`,
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
          Authorization: `Bearer ${process.env.EVOLUTION_API_KEY!}`,
        },
      }
    );

    const lista = Array.isArray(data) ? data : data?.instances || [];

    const instance = lista.find((item: any) => {
      const nome =
        item?.name ||
        item?.instanceName ||
        item?.instance?.name ||
        item?.instance?.instanceName;

      return nome === instanceName;
    });

    if (!instance) {
      return NextResponse.json({
        error: "Instância não encontrada na Evolution",
        instanceName,
      });
    }

    const estado =
      instance?.connectionStatus ||
      instance?.state ||
      instance?.instance?.connectionStatus ||
      instance?.instance?.state;

    const numero =
      instance?.ownerJid ||
      instance?.owner ||
      instance?.number ||
      instance?.instance?.ownerJid ||
      instance?.instance?.owner ||
      instance?.instance?.number ||
      null;

    if (estado === "open") {
      await supabase
        .from("instancias_evolution")
        .update({
          status: "conectado",
        })
        .eq("cliente_id", clienteId);

      return NextResponse.json({
        conectado: true,
        estado,
        numero,
        instanceName,
      });
    }

    const qrcode =
      instance?.qrcode ||
      instance?.qr ||
      instance?.base64 ||
      instance?.instance?.qrcode ||
      instance?.instance?.qr ||
      instance?.instance?.base64;

    if (qrcode && qrcode !== true) {
      let base64 = String(qrcode);

      if (!base64.startsWith("data:image")) {
        base64 = `data:image/png;base64,${base64}`;
      }

      return NextResponse.json({
        qrcode: base64,
        estado,
        instanceName,
      });
    }

    return NextResponse.json({
      error: "QR ainda não disponível",
      estado,
      instanceName,
    });
  } catch (error: any) {
    console.log("ERRO QR:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error: "Erro ao buscar status da instância",
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}