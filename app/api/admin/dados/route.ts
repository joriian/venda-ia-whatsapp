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

    const { data: planos } = await supabase
      .from("planos")
      .select("*")
      .order("valor", { ascending: true });

    const { data: clientes } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .order("criado_em", { ascending: false });

    return NextResponse.json({
      ok: true,
      admin: {
        nome: admin.nome,
        email: admin.email,
        nivel: admin.nivel,
      },
      planos: planos || [],
      clientes: clientes || [],
    });
  } catch (error: any) {
    console.log("ERRO ADMIN DADOS:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}