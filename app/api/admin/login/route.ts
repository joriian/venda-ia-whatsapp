import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function criarToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(req: Request) {
  try {
    const { email, senha } = await req.json();

    const emailTratado = String(email || "").trim().toLowerCase();
    const senhaTratada = String(senha || "").trim();

    if (!emailTratado || !senhaTratada) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const { data: admin } = await supabase
      .from("admin_users")
      .select("*")
      .ilike("email", emailTratado)
      .eq("ativo", true)
      .maybeSingle();

    if (!admin || String(admin.senha || "").trim() !== senhaTratada) {
      return NextResponse.json(
        { error: "Email ou senha incorretos" },
        { status: 401 }
      );
    }

    const token = criarToken();

    const expira = new Date();
    expira.setHours(expira.getHours() + 12);

    await supabase
      .from("admin_users")
      .update({
        session_token: token,
        session_expires_at: expira.toISOString(),
      })
      .eq("id", admin.id);

    return NextResponse.json({
      ok: true,
      token,
      admin: {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        nivel: admin.nivel,
      },
      expiresAt: expira.toISOString(),
    });
  } catch (error: any) {
    console.log("ERRO ADMIN LOGIN:", error.message);

    return NextResponse.json(
      { error: "Erro ao fazer login" },
      { status: 500 }
    );
  }
}