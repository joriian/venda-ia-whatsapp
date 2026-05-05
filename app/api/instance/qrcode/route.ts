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

    const res = await axios.get(
      `${process.env.EVOLUTION_API_URL}/instance/fetchInstances`,
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
        },
      }
    );

    const inst = res.data.find(
      (i: any) => i.name === instancia.instance_name
    );

    if (!inst) {
      return NextResponse.json({ error: "Instância não existe na Evolution" });
    }

    // ✅ CONECTADO
    if (inst.connectionStatus === "open") {
      return NextResponse.json({
        conectado: true,
      });
    }

    // 🔄 AINDA GERANDO QR
    if (inst.connectionStatus === "connecting") {
      return NextResponse.json({
        aguardando: true,
      });
    }

    // 📲 QR DISPONÍVEL (algumas versões)
    if (inst.qrcode) {
      return NextResponse.json({
        qrcode: inst.qrcode,
      });
    }

    return NextResponse.json({ aguardando: true });

  } catch (error: any) {
    console.log("ERRO QR:", error.response?.data || error.message);
    return NextResponse.json({ error: "Erro ao buscar QR" }, { status: 500 });
  }
}