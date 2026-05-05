import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "Sessão inválida" },
        { status: 401 }
      );
    }

    const { data: admin } = await supabase
      .from("admin_users")
      .select("*")
      .eq("session_token", token)
      .eq("ativo", true)
      .maybeSingle();

    if (!admin) {
      return NextResponse.json(
        { error: "Sessão não encontrada" },
        { status: 401 }
      );
    }

    const expira = admin.session_expires_at
      ? new Date(admin.session_expires_at)
      : null;

    if (!expira || expira < new Date()) {
      return NextResponse.json(
        { error: "Sessão expirada" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      admin: {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        nivel: admin.nivel,
      },
    });
  } catch (error: any) {
    console.log("ERRO ADMIN SESSAO:", error.message);

    return NextResponse.json(
      { error: "Erro ao validar sessão" },
      { status: 500 }
    );
  }
}