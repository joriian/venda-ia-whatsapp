import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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

export async function POST(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: permissao } = await supabase
      .from("admin_permissoes")
      .select("*")
      .eq("nivel", admin.nivel)
      .maybeSingle();

    if (!permissao?.pode_acessar_cliente) {
      return NextResponse.json(
        { error: "Seu nível não pode acessar painel de cliente" },
        { status: 403 }
      );
    }

    const { clienteId } = await req.json();

    if (!clienteId) {
      return NextResponse.json({ error: "Cliente obrigatório" }, { status: 400 });
    }

    const { data: cliente } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .eq("id", clienteId)
      .maybeSingle();

    if (!cliente) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const tokenCliente = crypto.randomBytes(32).toString("hex");

    const expira = new Date();
    expira.setMinutes(expira.getMinutes() + 30);

    await supabase
      .from("clientes_ia_whatsapp")
      .update({
        session_token: tokenCliente,
        session_expires_at: expira.toISOString(),
      })
      .eq("id", clienteId);

    return NextResponse.json({
      ok: true,
      token: tokenCliente,
      clienteId,
      expiresAt: expira.toISOString(),
      url: `/cliente?admin=1&cliente=${clienteId}&token=${tokenCliente}`,
    });
  } catch (error: any) {
    console.log("ERRO ACESSAR CLIENTE:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}