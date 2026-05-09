import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || "NEXORA_SECRET_2026";

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

function gerarTokenCliente(cliente: any) {
  return jwt.sign(
    {
      id: cliente.id,
      nome: cliente.nome,
      email: cliente.email,
      tipo: "cliente",
      acesso_admin: true,
    },
    JWT_SECRET,
    {
      expiresIn: "2h",
    }
  );
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

    if (admin.nivel !== "dono" && admin.nivel !== "admin") {
      return NextResponse.json(
        { error: "Seu nível não pode acessar painel de cliente" },
        { status: 403 }
      );
    }

    const { clienteId } = await req.json();

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

    const tokenCliente = gerarTokenCliente(cliente);

    return NextResponse.json({
      ok: true,
      token: tokenCliente,
      clienteId,
      url: `/cliente?cliente=${clienteId}&token=${tokenCliente}&admin=1`,
    });
  } catch (error: any) {
    console.log("ERRO ACESSAR CLIENTE:", error.message);

    return NextResponse.json(
      { error: "Erro ao acessar cliente" },
      { status: 500 }
    );
  }
}