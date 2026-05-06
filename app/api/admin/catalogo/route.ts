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

function podeGerenciarCatalogo(nivel: string) {
  return nivel === "dono" || nivel === "admin";
}

function limparSlug(valor: string) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export async function GET(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: servicos, error: servicosError } = await supabase
      .from("servicos_ia")
      .select("*, planos(*)")
      .order("ordem", { ascending: true });

    if (servicosError) {
      console.log("ERRO BUSCAR SERVICOS:", servicosError);
      return NextResponse.json(
        { error: "Erro ao buscar serviços" },
        { status: 500 }
      );
    }

    const { data: termos } = await supabase
      .from("termos_uso_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    const servicosFormatados = (servicos || []).map((servico: any) => ({
      ...servico,
      planos: (servico.planos || []).sort((a: any, b: any) => {
        return Number(a.ordem || 0) - Number(b.ordem || 0);
      }),
    }));

    return NextResponse.json({
      ok: true,
      servicos: servicosFormatados,
      termos,
    });
  } catch (error: any) {
    console.log("ERRO CATALOGO GET:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (!podeGerenciarCatalogo(admin.nivel)) {
      return NextResponse.json(
        { error: "Sem permissão para gerenciar catálogo" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const acao = body.acao;

    if (acao === "criar_servico") {
      const nome = String(body.nome || "").trim();
      const slug = limparSlug(body.slug || nome);
      const descricao = String(body.descricao || "").trim();

      if (!nome || !slug) {
        return NextResponse.json(
          { error: "Nome e slug são obrigatórios" },
          { status: 400 }
        );
      }

      const { error } = await supabase.from("servicos_ia").insert({
        nome,
        slug,
        descricao,
        ativo: true,
        ordem: Number(body.ordem || 0),
      });

      if (error) {
        console.log("ERRO CRIAR SERVICO:", error);
        return NextResponse.json(
          { error: "Erro ao criar serviço", detalhe: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (acao === "atualizar_servico") {
      const id = body.id;
      const nome = String(body.nome || "").trim();
      const slug = limparSlug(body.slug || nome);
      const descricao = String(body.descricao || "").trim();
      const ativo = Boolean(body.ativo);
      const ordem = Number(body.ordem || 0);

      if (!id || !nome || !slug) {
        return NextResponse.json(
          { error: "ID, nome e slug são obrigatórios" },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from("servicos_ia")
        .update({
          nome,
          slug,
          descricao,
          ativo,
          ordem,
        })
        .eq("id", id);

      if (error) {
        console.log("ERRO ATUALIZAR SERVICO:", error);
        return NextResponse.json(
          { error: "Erro ao atualizar serviço", detalhe: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (acao === "criar_plano") {
      const servico_id = body.servico_id;
      const nome = String(body.nome || "").trim();
      const descricao = String(body.descricao || "").trim();
      const valor = Number(String(body.valor || "0").replace(",", "."));
      const meses = Number(body.meses || 1);
      const destaque = Boolean(body.destaque);
      const ordem = Number(body.ordem || 0);

      if (!servico_id || !nome || !valor || !meses) {
        return NextResponse.json(
          { error: "Serviço, nome, valor e meses são obrigatórios" },
          { status: 400 }
        );
      }

      const { error } = await supabase.from("planos").insert({
        nome,
        meses,
        valor,
        ativo: true,
        servico_id,
        descricao,
        destaque,
        ordem,
      });

      if (error) {
        console.log("ERRO CRIAR PLANO:", error);
        return NextResponse.json(
          { error: "Erro ao criar plano", detalhe: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (acao === "atualizar_plano") {
      const id = body.id;
      const nome = String(body.nome || "").trim();
      const descricao = String(body.descricao || "").trim();
      const valor = Number(String(body.valor || "0").replace(",", "."));
      const meses = Number(body.meses || 1);
      const ativo = Boolean(body.ativo);
      const destaque = Boolean(body.destaque);
      const ordem = Number(body.ordem || 0);

      if (!id || !nome || !valor || !meses) {
        return NextResponse.json(
          { error: "ID, nome, valor e meses são obrigatórios" },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from("planos")
        .update({
          nome,
          descricao,
          valor,
          meses,
          ativo,
          destaque,
          ordem,
        })
        .eq("id", id);

      if (error) {
        console.log("ERRO ATUALIZAR PLANO:", error);
        return NextResponse.json(
          { error: "Erro ao atualizar plano", detalhe: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (acao === "atualizar_termos") {
      const titulo = String(body.titulo || "").trim();
      const conteudo = String(body.conteudo || "").trim();
      const ativo = Boolean(body.ativo);

      if (!titulo || !conteudo) {
        return NextResponse.json(
          { error: "Título e conteúdo são obrigatórios" },
          { status: 400 }
        );
      }

      const { error } = await supabase.from("termos_uso_config").upsert({
        id: 1,
        titulo,
        conteudo,
        ativo,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.log("ERRO ATUALIZAR TERMOS:", error);
        return NextResponse.json(
          { error: "Erro ao atualizar termos", detalhe: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error: any) {
    console.log("ERRO CATALOGO POST:", error.message);
    return NextResponse.json(
      { error: true, detalhe: error.message },
      { status: 500 }
    );
  }
}