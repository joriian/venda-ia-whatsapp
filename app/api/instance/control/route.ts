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
    const { clienteId, action } = await req.json();

    const { data: instancia } = await supabase
      .from("instancias_evolution")
      .select("*")
      .eq("cliente_id", clienteId)
      .single();

    if (!instancia) {
      return NextResponse.json({ error: "Instância não encontrada" }, { status: 404 });
    }

    const name = instancia.instance_name;

    // 🔌 CONECTAR / QR
    if (action === "connect") {
      await axios.post(
        `${API}/instance/connect/${name}`,
        {},
        { headers: { apikey: KEY } }
      );

      return NextResponse.json({ ok: true });
    }

    // ❌ DESCONECTAR
    if (action === "disconnect") {
      await axios.delete(
        `${API}/instance/logout/${name}`,
        { headers: { apikey: KEY } }
      );

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação inválida" });

  } catch (error: any) {
    console.log("ERRO CONTROL:", error.response?.data || error.message);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}