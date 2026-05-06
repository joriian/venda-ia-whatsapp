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

    if (admin.nivel !== "dono") {
      return NextResponse.json(
        { error: "Somente dono pode ver permissões" },
        { status: 403 }
      );
    }

    const { data: permissoes, error } = await supabase
      .from("admin_permissoes")
      .select("*")
      .order("nivel", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Erro ao buscar permissões" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      permissoes: permissoes || [],
    });
  } catch (error: any) {
    console.log("ERRO PERMISSOES GET:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (admin.nivel !== "dono") {
      return NextResponse.json(
        { error: "Somente dono pode alterar permissões" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const nivel = String(body.nivel || "").trim();

    if (!nivel) {
      return NextResponse.json({ error: "Nível obrigatório" }, { status: 400 });
    }

    if (nivel === "dono") {
      return NextResponse.json(
        { error: "As permissões do dono não podem ser alteradas" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("admin_permissoes")
      .update({
        pode_ver_resumo: Boolean(body.pode_ver_resumo),
        pode_gerenciar_catalogo: Boolean(body.pode_gerenciar_catalogo),
        pode_gerenciar_cupons: Boolean(body.pode_gerenciar_cupons),
        pode_ver_clientes: Boolean(body.pode_ver_clientes),
        pode_bloquear_clientes: Boolean(body.pode_bloquear_clientes),
        pode_cobrar_clientes: Boolean(body.pode_cobrar_clientes),
        pode_ver_instancias: Boolean(body.pode_ver_instancias),
        pode_gerenciar_admins: Boolean(body.pode_gerenciar_admins),
        pode_acessar_cliente: Boolean(body.pode_acessar_cliente),
        updated_at: new Date().toISOString(),
      })
      .eq("nivel", nivel);

    if (error) {
      return NextResponse.json(
        { error: "Erro ao atualizar permissões" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.log("ERRO PERMISSOES POST:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}