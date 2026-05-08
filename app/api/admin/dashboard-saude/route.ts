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
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: resumo, error: resumoError } = await supabase
      .from("vw_dashboard_saude")
      .select("*")
      .maybeSingle();

    if (resumoError) {
      return NextResponse.json(
        {
          error: "Erro ao buscar resumo de saúde",
          detalhe: resumoError.message,
        },
        { status: 500 }
      );
    }

    const { data: ultimosChecks } = await supabase
      .from("checks_webhooks")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(20);

    const { data: alertasCriticos } = await supabase
      .from("notificacoes_sistema")
      .select("*")
      .eq("resolved", false)
      .in("nivel", ["error", "warning"])
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: instancias } = await supabase
      .from("instancias_evolution")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      ok: true,
      resumo: resumo || {},
      ultimosChecks: ultimosChecks || [],
      alertasCriticos: alertasCriticos || [],
      instancias: instancias || [],
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