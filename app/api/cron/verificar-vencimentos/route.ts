import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");

    // 🔒 proteção
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    console.log("CRON: verificando vencimentos...");

    const hoje = new Date().toISOString();

    const { data: clientes, error } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .lt("data_expiracao", hoje)
      .eq("status", "ativo");

    if (error) {
      console.log("ERRO CRON:", error);
      return NextResponse.json({ error: true });
    }

    if (!clientes || clientes.length === 0) {
      console.log("CRON: nenhum cliente vencido");
      return NextResponse.json({ ok: true, clientes: 0 });
    }

    for (const cliente of clientes) {
      console.log("EXPIRANDO:", cliente.id);

      await supabase
        .from("clientes_ia_whatsapp")
        .update({
          status: "inativo",
        })
        .eq("id", cliente.id);
    }

    return NextResponse.json({
      ok: true,
      clientes_expirados: clientes.length,
    });
  } catch (error: any) {
    console.log("ERRO CRON:", error.message);

    return NextResponse.json({ error: true });
  }
}