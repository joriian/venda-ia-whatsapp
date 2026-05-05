import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { clienteId } = await req.json();

    if (!clienteId) {
      return NextResponse.json({ error: "Cliente inválido" }, { status: 400 });
    }

    const { data: cliente } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .eq("id", clienteId)
      .single();

    if (!cliente) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const agora = new Date();
    const expiracao = cliente.data_expiracao
      ? new Date(cliente.data_expiracao)
      : null;

    if (!expiracao || expiracao < agora) {
      const instanceName = `cliente_${clienteId}`.replace(/-/g, "");

      try {
        await axios.delete(
          `${process.env.EVOLUTION_API_URL}/instance/logout/${instanceName}`,
          {
            headers: {
              apikey: process.env.EVOLUTION_API_KEY!,
            },
          }
        );
      } catch {}

      await supabase
        .from("clientes_ia_whatsapp")
        .update({ status: "vencido" })
        .eq("id", clienteId);

      return NextResponse.json({
        ativo: false,
        mensagem: "Plano expirado",
      });
    }

    return NextResponse.json({
      ativo: true,
    });
  } catch (error: any) {
    console.log("ERRO VALIDAR:", error.message);

    return NextResponse.json({ error: true }, { status: 500 });
  }
}