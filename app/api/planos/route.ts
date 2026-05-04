import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("planos")
    .select("*")
    .eq("ativo", true)
    .order("meses", { ascending: true });

  if (error) {
    console.log("ERRO SUPABASE PLANOS:", error);

    return NextResponse.json(
      {
        error: "Erro ao buscar planos",
        detalhe: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}