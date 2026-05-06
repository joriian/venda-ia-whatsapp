import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: servicos, error } = await supabase
      .from("servicos_ia")
      .select(`
        *,
        planos (*)
      `)
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    if (error) {
      console.log("ERRO PLANOS:", error);
      return NextResponse.json({ error: "Erro ao buscar serviços" }, { status: 500 });
    }

    const formatado = (servicos || []).map((servico: any) => ({
      ...servico,
      planos: (servico.planos || [])
        .filter((plano: any) => plano.ativo)
        .sort((a: any, b: any) => Number(a.ordem || 0) - Number(b.ordem || 0)),
    }));

    return NextResponse.json(formatado);
  } catch (error: any) {
    console.log("ERRO API PLANOS:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}