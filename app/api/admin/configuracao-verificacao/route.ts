import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validarAdmin(req: Request) {
  const token = req.headers.get("x-admin-token");

  if (!token) return null;

  const { data } = await supabase
    .from("admin_users")
    .select("*")
    .eq("session_token", token)
    .eq("ativo", true)
    .maybeSingle();

  return data || null;
}

export async function GET(req: Request) {
  const admin = await validarAdmin(req);

  if (!admin) {
    return NextResponse.json(
      { error: "Não autorizado" },
      { status: 401 }
    );
  }

  const { data } = await supabase
    .from("configuracoes_sistema")
    .select("*")
    .eq("chave", "whatsapp_verificacao")
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    configuracao: data?.valor || {
      instance_name: "",
      numero: "",
      ativo: false,
    },
  });
}

export async function POST(req: Request) {
  const admin = await validarAdmin(req);

  if (!admin) {
    return NextResponse.json(
      { error: "Não autorizado" },
      { status: 401 }
    );
  }

  const body = await req.json();

  const valor = {
    instance_name: body.instance_name || "",
    numero: body.numero || "",
    ativo: Boolean(body.ativo),
  };

  const { error } = await supabase
    .from("configuracoes_sistema")
    .upsert(
      {
        chave: "whatsapp_verificacao",
        valor,
        atualizado_em: new Date().toISOString(),
      },
      {
        onConflict: "chave",
      }
    );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    configuracao: valor,
  });
}