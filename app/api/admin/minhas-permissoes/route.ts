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

    if (admin.nivel === "dono") {
      return NextResponse.json({
        ok: true,
        nivel: "dono",
        permissoes: {
          pode_ver_resumo: true,
          pode_gerenciar_catalogo: true,
          pode_gerenciar_cupons: true,
          pode_ver_clientes: true,
          pode_bloquear_clientes: true,
          pode_cobrar_clientes: true,
          pode_ver_instancias: true,
          pode_gerenciar_admins: true,
          pode_acessar_cliente: true,
        },
      });
    }

    const { data: permissoes } = await supabase
      .from("admin_permissoes")
      .select("*")
      .eq("nivel", admin.nivel)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      nivel: admin.nivel,
      permissoes: permissoes || {},
    });
  } catch (error: any) {
    console.log("ERRO MINHAS PERMISSOES:", error.message);

    return NextResponse.json(
      { error: "Erro ao buscar permissões" },
      { status: 500 }
    );
  }
}