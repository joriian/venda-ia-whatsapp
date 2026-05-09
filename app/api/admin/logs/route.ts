import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  return admin;
}

export async function GET(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    const busca = searchParams.get("busca") || "";
    const status = searchParams.get("status") || "todos";

    let query = supabase
      .from("logs_mensagens")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(100);

    if (status === "enviado") {
      query = query.eq("enviado_n8n", true);
    }

    if (status === "erro") {
      query = query.eq("enviado_n8n", false);
    }

    if (busca.trim()) {
      query = query.or(
        `instance_name.ilike.%${busca}%,evento.ilike.%${busca}%,remetente.ilike.%${busca}%,nome_remetente.ilike.%${busca}%,mensagem.ilike.%${busca}%`
      );
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          error: "Erro ao buscar logs",
          detalhe: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      logs: logs || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Erro interno",
        detalhe: error.message,
      },
      { status: 500 }
    );
  }
}