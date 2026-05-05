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

function podeEditarPlanos(nivel: string) {
  return nivel === "dono" || nivel === "admin";
}

export async function POST(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (!podeEditarPlanos(admin.nivel)) {
      return NextResponse.json(
        { error: "Sem permissão para alterar planos" },
        { status: 403 }
      );
    }

    const plano = await req.json();

    if (!plano.id) {
      return NextResponse.json({ error: "ID do plano obrigatório" }, { status: 400 });
    }

    const { error } = await supabase
      .from("planos")
      .update({
        nome: plano.nome,
        valor: Number(plano.valor),
        meses: Number(plano.meses),
        ativo: Boolean(plano.ativo),
      })
      .eq("id", plano.id);

    if (error) {
      console.log("ERRO SALVAR PLANO:", error);
      return NextResponse.json({ error: "Erro ao salvar plano" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.log("ERRO ADMIN PLANOS:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}