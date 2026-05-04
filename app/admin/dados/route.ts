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

export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { data: planos } = await supabase
    .from("planos")
    .select("*")
    .order("meses", { ascending: true });

  const { data: clientes } = await supabase
    .from("clientes_ia_whatsapp")
    .select("*")
    .order("criado_em", { ascending: false });

  const { data: pagamentos } = await supabase
    .from("pagamentos_ia_whatsapp")
    .select("*")
    .order("criado_em", { ascending: false });

  const { data: instancias } = await supabase
    .from("instancias_evolution")
    .select("*")
    .order("criado_em", { ascending: false });

  return NextResponse.json({
    planos: planos || [],
    clientes: clientes || [],
    pagamentos: pagamentos || [],
    instancias: instancias || [],
  });
}