import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizarCodigo(codigo: string) {
  return String(codigo || "").trim().toUpperCase();
}

function calcularDesconto(tipo: string, valorCupom: number, valorPlano: number) {
  if (tipo === "percentual") {
    return Math.min(valorPlano, (valorPlano * valorCupom) / 100);
  }

  return Math.min(valorPlano, valorCupom);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const codigo = normalizarCodigo(body.codigo);
    const planoId = String(body.planoId || "").trim();
    const servicoId = String(body.servicoId || "").trim();

    if (!codigo || !planoId || !servicoId) {
      return NextResponse.json(
        { error: "Informe cupom, serviço e plano" },
        { status: 400 }
      );
    }

    const { data: plano } = await supabase
      .from("planos")
      .select("*")
      .eq("id", planoId)
      .eq("ativo", true)
      .maybeSingle();

    if (!plano) {
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
    }

    const { data: cupom } = await supabase
      .from("cupons_desconto")
      .select("*")
      .eq("codigo", codigo)
      .maybeSingle();

    if (!cupom || !cupom.ativo) {
      return NextResponse.json({ error: "Cupom inválido ou inativo" }, { status: 400 });
    }

    const agora = new Date();

    if (cupom.data_inicio && new Date(cupom.data_inicio) > agora) {
      return NextResponse.json({ error: "Cupom ainda não está disponível" }, { status: 400 });
    }

    if (cupom.data_fim && new Date(cupom.data_fim) < agora) {
      return NextResponse.json({ error: "Cupom expirado" }, { status: 400 });
    }

    if (cupom.limite_usos && Number(cupom.usos_atuais || 0) >= Number(cupom.limite_usos)) {
      return NextResponse.json({ error: "Cupom atingiu o limite de usos" }, { status: 400 });
    }

    if (cupom.servico_id && cupom.servico_id !== servicoId) {
      return NextResponse.json({ error: "Cupom não é válido para este serviço" }, { status: 400 });
    }

    if (cupom.plano_id && cupom.plano_id !== planoId) {
      return NextResponse.json({ error: "Cupom não é válido para este plano" }, { status: 400 });
    }

    const valorOriginal = Number(plano.valor || 0);
    const descontoValor = calcularDesconto(
      String(cupom.tipo || "percentual"),
      Number(cupom.valor || 0),
      valorOriginal
    );

    const valorFinal = Math.max(0, valorOriginal - descontoValor);

    return NextResponse.json({
      ok: true,
      cupom: {
        id: cupom.id,
        codigo: cupom.codigo,
        descricao: cupom.descricao,
        tipo: cupom.tipo,
        valor: Number(cupom.valor || 0),
      },
      valorOriginal,
      descontoValor,
      valorFinal,
    });
  } catch (error: any) {
    console.log("ERRO VALIDAR CUPOM:", error.message);

    return NextResponse.json(
      { error: "Erro ao validar cupom" },
      { status: 500 }
    );
  }
}