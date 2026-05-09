import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

import { registrarAuditoriaAdmin } from "@/lib/admin/auditoria";

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

function normalizarEventos(eventos: any) {
  if (Array.isArray(eventos)) {
    return eventos
      .map((e) => String(e).trim().toUpperCase())
      .filter(Boolean);
  }

  if (typeof eventos === "string") {
    return eventos
      .split(",")
      .map((e) => e.trim().toUpperCase())
      .filter(Boolean);
  }

  return ["MESSAGES_UPSERT", "CONNECTION_UPDATE"];
}

function slugify(texto: string) {
  return String(texto || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { data: servicos, error: servicosError } = await supabase
      .from("servicos_ia")
      .select(`
        *,
        planos (*)
      `)
      .order("ordem", { ascending: true });

    if (servicosError) {
      return NextResponse.json(
        {
          error: "Erro ao buscar serviços",
          detalhe: servicosError.message,
        },
        { status: 500 }
      );
    }

    const servicosOrdenados = (servicos || []).map((servico: any) => ({
      ...servico,
      planos: (servico.planos || []).sort((a: any, b: any) => {
        return Number(a.ordem || 0) - Number(b.ordem || 0);
      }),
    }));

    let termos = null;

    try {
      const { data } = await supabase
        .from("termos_uso")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      termos = data;
    } catch {
      termos = null;
    }

    return NextResponse.json({
      ok: true,
      servicos: servicosOrdenados,
      termos,
    });
  } catch (error: any) {
    console.log("ERRO GET CATALOGO:", error.message);

    return NextResponse.json(
      {
        error: "Erro interno",
        detalhe: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    if (
      admin.nivel !== "dono" &&
      admin.nivel !== "admin"
    ) {
      return NextResponse.json(
        { error: "Sem permissão para gerenciar catálogo" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const acao = body.acao;

    if (acao === "criar_servico") {
      const nome = String(body.nome || "").trim();

      if (!nome) {
        return NextResponse.json(
          { error: "Nome do serviço é obrigatório" },
          { status: 400 }
        );
      }

      const slug = body.slug ? slugify(body.slug) : slugify(nome);

      const payload = {
        id: body.id || crypto.randomUUID(),
        nome,
        slug,
        descricao: body.descricao || "",
        ativo: body.ativo ?? true,
        ordem: Number(body.ordem || 0),
        workflow_id: body.workflow_id || null,
        webhook_url: body.webhook_url || null,
        workflow_tipo: body.workflow_tipo || "whatsapp",
        evolution_events: normalizarEventos(body.evolution_events),
        evolution_webhook_enabled:
          body.evolution_webhook_enabled ?? true,
        evolution_webhook_base64:
          body.evolution_webhook_base64 ?? true,
      };

      const { data, error } = await supabase
        .from("servicos_ia")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json(
          {
            error: "Erro ao criar serviço",
            detalhe: error.message,
          },
          { status: 500 }
        );
      }

      await registrarAuditoriaAdmin({
        admin,
        acao: "criou_servico",
        entidade: "servico",
        entidadeId: data.id,
        descricao: `Criou serviço ${data.nome}`,
        payload: data,
        req,
      });

      return NextResponse.json({
        ok: true,
        servico: data,
      });
    }

    if (acao === "atualizar_servico") {
      if (!body.id) {
        return NextResponse.json(
          { error: "ID do serviço é obrigatório" },
          { status: 400 }
        );
      }

      const nome = String(body.nome || "").trim();

      if (!nome) {
        return NextResponse.json(
          { error: "Nome do serviço é obrigatório" },
          { status: 400 }
        );
      }

      const payload = {
        nome,
        slug: body.slug ? slugify(body.slug) : slugify(nome),
        descricao: body.descricao || "",
        ativo: body.ativo ?? true,
        ordem: Number(body.ordem || 0),
        workflow_id: body.workflow_id || null,
        webhook_url: body.webhook_url || null,
        workflow_tipo: body.workflow_tipo || "whatsapp",
        evolution_events: normalizarEventos(body.evolution_events),
        evolution_webhook_enabled:
          body.evolution_webhook_enabled ?? true,
        evolution_webhook_base64:
          body.evolution_webhook_base64 ?? true,
      };

      const { data, error } = await supabase
        .from("servicos_ia")
        .update(payload)
        .eq("id", body.id)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json(
          {
            error: "Erro ao atualizar serviço",
            detalhe: error.message,
          },
          { status: 500 }
        );
      }

      await registrarAuditoriaAdmin({
        admin,
        acao: "editou_servico",
        entidade: "servico",
        entidadeId: data.id,
        descricao: `Editou serviço ${data.nome}`,
        payload: data,
        req,
      });

      return NextResponse.json({
        ok: true,
        servico: data,
      });
    }

    if (acao === "criar_plano") {
      if (!body.servico_id) {
        return NextResponse.json(
          { error: "Serviço do plano é obrigatório" },
          { status: 400 }
        );
      }

      const nome = String(body.nome || "").trim();

      if (!nome) {
        return NextResponse.json(
          { error: "Nome do plano é obrigatório" },
          { status: 400 }
        );
      }

      const payload = {
        id: body.id || crypto.randomUUID(),
        servico_id: body.servico_id,
        nome,
        descricao: body.descricao || "",
        valor: Number(String(body.valor || "0").replace(",", ".")),
        meses: Number(body.meses || 1),
        ativo: body.ativo ?? true,
        destaque: body.destaque ?? false,
        ordem: Number(body.ordem || 0),
      };

      const { data, error } = await supabase
        .from("planos")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json(
          {
            error: "Erro ao criar plano",
            detalhe: error.message,
          },
          { status: 500 }
        );
      }

      await registrarAuditoriaAdmin({
        admin,
        acao: "criou_plano",
        entidade: "plano",
        entidadeId: data.id,
        descricao: `Criou plano ${data.nome}`,
        payload: data,
        req,
      });

      return NextResponse.json({
        ok: true,
        plano: data,
      });
    }

    if (acao === "atualizar_plano") {
      if (!body.id) {
        return NextResponse.json(
          { error: "ID do plano é obrigatório" },
          { status: 400 }
        );
      }

      const nome = String(body.nome || "").trim();

      if (!nome) {
        return NextResponse.json(
          { error: "Nome do plano é obrigatório" },
          { status: 400 }
        );
      }

      const payload = {
        servico_id: body.servico_id,
        nome,
        descricao: body.descricao || "",
        valor: Number(String(body.valor || "0").replace(",", ".")),
        meses: Number(body.meses || 1),
        ativo: body.ativo ?? true,
        destaque: body.destaque ?? false,
        ordem: Number(body.ordem || 0),
      };

      const { data, error } = await supabase
        .from("planos")
        .update(payload)
        .eq("id", body.id)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json(
          {
            error: "Erro ao atualizar plano",
            detalhe: error.message,
          },
          { status: 500 }
        );
      }

      await registrarAuditoriaAdmin({
        admin,
        acao: "editou_plano",
        entidade: "plano",
        entidadeId: data.id,
        descricao: `Editou plano ${data.nome}`,
        payload: data,
        req,
      });

      return NextResponse.json({
        ok: true,
        plano: data,
      });
    }

    if (acao === "excluir_plano") {
      const planoId = String(body.id || "").trim();

      if (!planoId) {
        return NextResponse.json(
          { error: "ID do plano é obrigatório" },
          { status: 400 }
        );
      }

      const { data: usados } = await supabase
        .from("cliente_servicos")
        .select("id")
        .eq("plano_id", planoId)
        .limit(1);

      if (usados && usados.length > 0) {
        return NextResponse.json(
          {
            error:
              "Este plano está vinculado a cliente. Desative o plano em vez de excluir.",
          },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from("planos")
        .delete()
        .eq("id", planoId);

      if (error) {
        return NextResponse.json(
          {
            error: "Erro ao excluir plano",
            detalhe: error.message,
          },
          { status: 500 }
        );
      }

      await registrarAuditoriaAdmin({
        admin,
        acao: "excluiu_plano",
        entidade: "plano",
        entidadeId: planoId,
        descricao: "Excluiu plano",
        payload: {
          planoId,
        },
        req,
      });

      return NextResponse.json({
        ok: true,
        acao: "plano_excluido",
      });
    }

    if (acao === "excluir_servico") {
      const servicoId = String(body.id || "").trim();

      if (!servicoId) {
        return NextResponse.json(
          { error: "ID do serviço é obrigatório" },
          { status: 400 }
        );
      }

      const { data: clientesUsando } = await supabase
        .from("cliente_servicos")
        .select("id")
        .eq("servico_id", servicoId)
        .limit(1);

      if (clientesUsando && clientesUsando.length > 0) {
        return NextResponse.json(
          {
            error:
              "Este serviço está vinculado a cliente. Desative o serviço em vez de excluir.",
          },
          { status: 400 }
        );
      }

      const { data: planosDoServico } = await supabase
        .from("planos")
        .select("id")
        .eq("servico_id", servicoId);

      if (planosDoServico && planosDoServico.length > 0) {
        const planoIds = planosDoServico.map((p: any) => p.id);

        const { data: planosUsados } = await supabase
          .from("cliente_servicos")
          .select("id")
          .in("plano_id", planoIds)
          .limit(1);

        if (planosUsados && planosUsados.length > 0) {
          return NextResponse.json(
            {
              error:
                "Existe plano deste serviço vinculado a cliente. Desative o serviço em vez de excluir.",
            },
            { status: 400 }
          );
        }
      }

      await supabase
        .from("planos")
        .delete()
        .eq("servico_id", servicoId);

      const { error } = await supabase
        .from("servicos_ia")
        .delete()
        .eq("id", servicoId);

      if (error) {
        return NextResponse.json(
          {
            error: "Erro ao excluir serviço",
            detalhe: error.message,
          },
          { status: 500 }
        );
      }

      await registrarAuditoriaAdmin({
        admin,
        acao: "excluiu_servico",
        entidade: "servico",
        entidadeId: servicoId,
        descricao: "Excluiu serviço",
        payload: {
          servicoId,
        },
        req,
      });

      return NextResponse.json({
        ok: true,
        acao: "servico_excluido",
      });
    }

    if (acao === "atualizar_termos") {
      const payload = {
        titulo: body.titulo || "Termos de uso",
        conteudo: body.conteudo || "",
        ativo: body.ativo ?? true,
        updated_at: new Date().toISOString(),
      };

      if (body.id) {
        const { data, error } = await supabase
          .from("termos_uso")
          .update(payload)
          .eq("id", body.id)
          .select("*")
          .single();

        if (error) {
          return NextResponse.json(
            {
              error: "Erro ao atualizar termos",
              detalhe: error.message,
            },
            { status: 500 }
          );
        }

        await registrarAuditoriaAdmin({
          admin,
          acao: "editou_termos",
          entidade: "termos",
          entidadeId: data.id,
          descricao: "Atualizou termos de uso",
          payload: data,
          req,
        });

        return NextResponse.json({
          ok: true,
          termos: data,
        });
      }

      const { data, error } = await supabase
        .from("termos_uso")
        .insert({
          id: crypto.randomUUID(),
          ...payload,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json(
          {
            error: "Erro ao criar termos",
            detalhe: error.message,
          },
          { status: 500 }
        );
      }

      await registrarAuditoriaAdmin({
        admin,
        acao: "criou_termos",
        entidade: "termos",
        entidadeId: data.id,
        descricao: "Criou termos de uso",
        payload: data,
        req,
      });

      return NextResponse.json({
        ok: true,
        termos: data,
      });
    }

    return NextResponse.json(
      { error: "Ação inválida" },
      { status: 400 }
    );
  } catch (error: any) {
    console.log("ERRO POST CATALOGO:", error.message);

    return NextResponse.json(
      {
        error: "Erro interno",
        detalhe: error.message,
      },
      { status: 500 }
    );
  }
}