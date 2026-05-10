import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const auth =
      req.headers.get("authorization");

    if (
      auth !==
      `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json(
        {
          error: "Não autorizado",
        },
        { status: 401 }
      );
    }

    const agora = new Date().toISOString();

    const { data: vencidos, error } =
      await supabase
        .from("cliente_servicos")
        .select(`
          *,
          clientes_ia_whatsapp (
            id,
            nome,
            email
          ),
          servicos_ia (
            id,
            nome
          )
        `)
        .eq("status", "ativo")
        .lt("data_expiracao", agora);

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      );
    }

    const processados = [];

    for (const servico of vencidos || []) {
      await supabase
        .from("cliente_servicos")
        .update({
          status: "vencido",
          evolution_status:
            "desconectado",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", servico.id);

      processados.push({
        cliente:
          servico
            .clientes_ia_whatsapp
            ?.nome,
        servico:
          servico.servicos_ia?.nome,
        expiracao:
          servico.data_expiracao,
      });
    }

    return NextResponse.json({
      ok: true,
      total: processados.length,
      processados,
    });
  } catch (error: any) {
    console.log(
      "ERRO CRON VENCIMENTO:",
      error.message
    );

    return NextResponse.json(
      {
        error:
          "Erro ao verificar vencimentos",
      },
      { status: 500 }
    );
  }
}