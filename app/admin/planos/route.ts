import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function autorizado(req: Request) {
  const senha = req.headers.get("x-admin-password");
  return senha && senha === process.env.ADMIN_PASSWORD;
}

export async function PUT(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { id, nome, valor, meses, ativo } = body;

  const { error } = await supabase
    .from("planos")
    .update({
      nome,
      valor: Number(valor),
      meses: Number(meses),
      ativo: Boolean(ativo),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}