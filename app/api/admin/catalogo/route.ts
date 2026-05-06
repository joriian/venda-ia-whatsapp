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

export async function GET(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: servicos } = await supabase
      .from("servicos_ia")
      .select("*, planos(*)")
      .order("ordem", { ascending: true });

    const { data: termos } = await supabase
      .from("termos_uso_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      servicos: servicos || [],
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
      const slug = String(body.slug || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
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
        return NextResponse.json({ error: "Erro ao criar serviço" }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (acao === "atualizar_servico") {
      const { id, nome, slug, descricao, ativo, ordem } = body;

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
          ativo: Boolean(ativo),
          ordem: Number(ordem || 0),
        })
        .eq("id", id);

      if (error) {
        console.log("ERRO ATUALIZAR SERVICO:", error);
        return NextResponse.json({ error: "Erro ao atualizar serviço" }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (acao === "criar_plano") {
      const { servico_id, nome, descricao, valor, meses, destaque, ordem } = body;

      if (!servico_id || !nome || !valor || !meses) {
        return NextResponse.json(
          { error: "Serviço, nome, valor e meses são obrigatórios" },
          { status: 400 }
        );
      }

      const { error } = await supabase.from("planos").insert({
        servico_id,
        nome,
        descricao: descricao || "",
        valor: Number(valor),
        meses: Number(meses),
        destaque: Boolean(destaque),
        ordem: Number(ordem || 0),
        ativo: true,
      });

      if (error) {
        console.log("ERRO CRIAR PLANO:", error);
        return NextResponse.json({ error: "Erro ao criar plano" }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (acao === "atualizar_plano") {
      const { id, nome, descricao, valor, meses, ativo, destaque, ordem } = body;

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
          descricao: descricao || "",
          valor: Number(valor),
          meses: Number(meses),
          ativo: Boolean(ativo),
          destaque: Boolean(destaque),
          ordem: Number(ordem || 0),
        })
        .eq("id", id);

      if (error) {
        console.log("ERRO ATUALIZAR PLANO:", error);
        return NextResponse.json({ error: "Erro ao atualizar plano" }, { status: 500 });
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

      const { error } = await supabase
        .from("termos_uso_config")
        .upsert({
          id: 1,
          titulo,
          conteudo,
          ativo,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.log("ERRO ATUALIZAR TERMOS:", error);
        return NextResponse.json({ error: "Erro ao atualizar termos" }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error: any) {
    console.log("ERRO CATALOGO POST:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}