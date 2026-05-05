import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validarSessao(clienteId: string, token: string) {
  if (!clienteId || !token) return false;

  const { data: cliente } = await supabase
    .from("clientes_ia_whatsapp")
    .select("*")
    .eq("id", clienteId)
    .eq("session_token", token)
    .maybeSingle();

  if (!cliente) return false;

  const expiraSessao = cliente.session_expires_at
    ? new Date(cliente.session_expires_at)
    : null;

  if (!expiraSessao || expiraSessao < new Date()) return false;

  return cliente;
}

export async function POST(req: Request) {
  try {
    const { clienteId, token } = await req.json();

    const cliente = await validarSessao(clienteId, token);

    if (!cliente) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    const agora = new Date();
    const expiracao = cliente.data_expiracao
      ? new Date(cliente.data_expiracao)
      : null;

    if (!expiracao || expiracao < agora || cliente.status === "vencido") {
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

      await supabase
        .from("instancias_evolution")
        .update({ status: "bloqueado_vencido" })
        .eq("cliente_id", clienteId);

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