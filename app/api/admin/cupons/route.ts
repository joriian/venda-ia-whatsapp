import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validarAdmin(req: Request) {
  const token = req.headers.get("x-admin-token");

  if (!token) return null;

  const { data: admin } = await supabase
    .from("admin_users")
    .select("*")
    .eq("session_token", token)
    .eq("ativo", true)
    .maybeSingle();

  if (!admin) return null;

  const expira = admin.session_expires_at
    ? new Date(admin.session_expires_at)
    : null;

  if (!expira || expira < new Date()) return null;

  return admin;
}

function podeGerenciarCupons(nivel: string) {
  return nivel === "dono" || nivel === "admin" || nivel === "financeiro";
}

function normalizarCodigo(codigo: string) {
  return String(codigo || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export async function GET(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (!podeGerenciarCupons(admin.nivel)) {
      return NextResponse.json(
        { error: "Sem permissão para gerenciar cupons" },
        { status: 403 }
      );
    }

    const { data: cupons, error } = await supabase
      .from("cupons_desconto")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("ERRO LISTAR CUPONS:", error);
      return NextResponse.json({ error: "Erro ao listar cupons" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      cupons: cupons || [],
    });
  } catch (error: any) {
    console.log("ERRO CUPONS GET:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (!podeGerenciarCupons(admin.nivel)) {
      return NextResponse.json(
        { error: "Sem permissão para gerenciar cupons" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const acao = body.acao;

    if (acao === "criar") {
      const codigo = normalizarCodigo(body.codigo);
      const descricao = String(body.descricao || "").trim();
      const tipo = String(body.tipo || "percentual").trim();
      const valor = Number(String(body.valor || "0").replace(",", "."));
      const limite_usos = body.limite_usos ? Number(body.limite_usos) : null;
      const servico_id = body.servico_id || null;
      const plano_id = body.plano_id || null;
      const data_inicio = body.data_inicio || null;
      const data_fim = body.data_fim || null;

      if (!codigo || !valor) {
        return NextResponse.json(
          { error: "Código e valor são obrigatórios" },
          { status: 400 }
        );
      }

      if (!["percentual", "fixo"].includes(tipo)) {
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
      }

      const { error } = await supabase.from("cupons_desconto").insert({
        codigo,
        descricao,
        tipo,
        valor,
        ativo: true,
        limite_usos,
        servico_id,
        plano_id,
        data_inicio,
        data_fim,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.log("ERRO CRIAR CUPOM:", error);
        return NextResponse.json(
          { error: "Erro ao criar cupom", detalhe: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (acao === "atualizar") {
      const id = body.id;
      const codigo = normalizarCodigo(body.codigo);
      const descricao = String(body.descricao || "").trim();
      const tipo = String(body.tipo || "percentual").trim();
      const valor = Number(String(body.valor || "0").replace(",", "."));
      const ativo = Boolean(body.ativo);
      const limite_usos = body.limite_usos ? Number(body.limite_usos) : null;
      const servico_id = body.servico_id || null;
      const plano_id = body.plano_id || null;
      const data_inicio = body.data_inicio || null;
      const data_fim = body.data_fim || null;

      if (!id || !codigo || !valor) {
        return NextResponse.json(
          { error: "ID, código e valor são obrigatórios" },
          { status: 400 }
        );
      }

      if (!["percentual", "fixo"].includes(tipo)) {
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
      }

      const { error } = await supabase
        .from("cupons_desconto")
        .update({
          codigo,
          descricao,
          tipo,
          valor,
          ativo,
          limite_usos,
          servico_id,
          plano_id,
          data_inicio,
          data_fim,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.log("ERRO ATUALIZAR CUPOM:", error);
        return NextResponse.json(
          { error: "Erro ao atualizar cupom", detalhe: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error: any) {
    console.log("ERRO CUPONS POST:", error.message);
    return NextResponse.json(
      { error: true, detalhe: error.message },
      { status: 500 }
    );
  }
}