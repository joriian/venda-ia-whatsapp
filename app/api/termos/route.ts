import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: termos } = await supabase
      .from("termos_uso_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      termos: termos || {
        titulo: "Termos de uso",
        conteudo:
          "Ao continuar, você declara que leu e aceita os termos de uso da plataforma.",
        ativo: true,
      },
    });
  } catch (error: any) {
    console.log("ERRO TERMOS:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}