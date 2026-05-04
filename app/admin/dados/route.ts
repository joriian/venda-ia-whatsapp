import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function autorizado(req: Request) {
  const senhaDigitada = req.headers.get("x-admin-password")?.trim();
  const senhaEnv = process.env.ADMIN_PASSWORD?.trim();

  console.log("ADMIN HEADER:", senhaDigitada);
  console.log("ADMIN ENV EXISTE:", senhaEnv ? "SIM" : "NAO");

  return senhaDigitada === senhaEnv;
}

export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json(
      { error: "Senha incorreta ou ADMIN_PASSWORD não configurado" },
      { status: 401 }
    );
  }

  const { data: planos, error: planosError } = await supabase
    .from("planos")
    .select("*")
    .order("meses", { ascending: true });

  const { data: clientes, error: clientesError } = await supabase
    .from("clientes_ia_whatsapp")
    .select("*")
    .order("criado_em", { ascending: false });

  const { data: pagamentos, error: pagamentosError } = await supabase
    .from("pagamentos_ia_whatsapp")
    .select("*")
    .order("criado_em", { ascending: false });

  const { data: instancias, error: instanciasError } = await supabase
    .from("instancias_evolution")
    .select("*")
    .order("criado_em", { ascending: false });

  if (planosError || clientesError || pagamentosError || instanciasError) {
    return NextResponse.json(
      {
        error: "Erro ao buscar dados",
        detalhes: {
          planos: planosError?.message,
          clientes: clientesError?.message,
          pagamentos: pagamentosError?.message,
          instancias: instanciasError?.message,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    planos: planos || [],
    clientes: clientes || [],
    pagamentos: pagamentos || [],
    instancias: instancias || [],
  });
}