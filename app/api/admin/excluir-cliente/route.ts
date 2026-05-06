import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validarAdmin(req: Request) {
  const token = req.headers.get("x-admin-token");

  if (!token) return null;

  const { data: admin } = await supabase
    .from("admin_users")
    .select("*")
    .eq("session_token", token)
    .eq("ativo", true)
    .maybeSingle();

  if (!admin) return null;

  const expira = admin.session_expires_at
    ? new Date(admin.session_expires_at)
    : null;

  if (!expira || expira < new Date()) return null;

  if (admin.nivel !== "dono" && admin.nivel !== "admin") return null;

  return admin;
}

async function deletarInstanciaEvolution(instanceName: string) {
  if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
    return {
      ok: false,
      detalhe: "Evolution API não configurada",
    };
  }

  try {
    await axios.delete(
      `${process.env.EVOLUTION_API_URL}/instance/delete/${instanceName}`,
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY,
        },
      }
    );

    return {
      ok: true,
      detalhe: "Instância removida da Evolution",
    };
  } catch (error: any) {
    console.log("ERRO DELETAR INSTANCIA EVOLUTION:", error.response?.data || error.message);

    return {
      ok: false,
      detalhe: error.response?.data || error.message,
    };
  }
}

export async function POST(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const clienteId = String(body.cliente_id || "").trim();

    if (!clienteId) {
      return NextResponse.json(
        { error: "Cliente obrigatório" },
        { status: 400 }
      );
    }

    const { data: cliente } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .eq("id", clienteId)
      .maybeSingle();

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    const instanceName = `cliente_${clienteId}`.replace(/-/g, "");
    const resultadoEvolution = await deletarInstanciaEvolution(instanceName);

    await supabase
      .from("cliente_servicos")
      .delete()
      .eq("cliente_id", clienteId);

    await supabase
      .from("pagamentos_ia_whatsapp")
      .delete()
      .eq("cliente_id", clienteId);

    await supabase
      .from("instancias_evolution")
      .delete()
      .eq("cliente_id", clienteId);

    await supabase
      .from("clientes_ia_whatsapp")
      .delete()
      .eq("id", clienteId);

    return NextResponse.json({
      ok: true,
      message: "Cliente excluído com sucesso",
      evolution: resultadoEvolution,
    });
  } catch (error: any) {
    console.log("ERRO EXCLUIR CLIENTE:", error.message);

    return NextResponse.json(
      {
        error: "Erro ao excluir cliente",
        detalhe: error.message,
      },
      { status: 500 }
    );
  }
}