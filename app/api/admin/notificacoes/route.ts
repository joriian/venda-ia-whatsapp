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

async function anexarClientes(notificacoes: any[]) {
  return Promise.all(
    (notificacoes || []).map(async (n: any) => {
      if (!n.cliente_id) {
        return {
          ...n,
          clientes_ia_whatsapp: null,
        };
      }

      const { data: cliente } = await supabase
        .from("clientes_ia_whatsapp")
        .select("nome,email,telefone")
        .eq("id", n.cliente_id)
        .maybeSingle();

      return {
        ...n,
        clientes_ia_whatsapp: cliente || null,
      };
    })
  );
}

export async function GET(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const busca = searchParams.get("busca") || "";
    const nivel = searchParams.get("nivel") || "todos";
    const status = searchParams.get("status") || "abertas";

    let query = supabase
      .from("notificacoes_sistema")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(150);

    if (nivel !== "todos") {
      query = query.eq("nivel", nivel);
    }

    if (status === "abertas") {
      query = query.eq("resolved", false);
    }

    if (status === "resolvidas") {
      query = query.eq("resolved", true);
    }

    if (busca.trim()) {
      query = query.or(
        `tipo.ilike.%${busca}%,titulo.ilike.%${busca}%,mensagem.ilike.%${busca}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          error: "Erro ao buscar notificações",
          detalhe: error.message,
        },
        { status: 500 }
      );
    }

    const notificacoes = await anexarClientes(data || []);

    return NextResponse.json({
      ok: true,
      notificacoes,
    });
  } catch (error: any) {
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
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();

    const acao = body.acao;
    const id = body.id;

    if (!id) {
      return NextResponse.json(
        { error: "ID da notificação obrigatório" },
        { status: 400 }
      );
    }

    if (acao === "lida") {
      const { error } = await supabase
        .from("notificacoes_sistema")
        .update({
          lida: true,
        })
        .eq("id", id);

      if (error) {
        return NextResponse.json(
          {
            error: "Erro ao marcar como lida",
            detalhe: error.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (acao === "resolver") {
      const { error } = await supabase
        .from("notificacoes_sistema")
        .update({
          lida: true,
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: admin.email || admin.nome || "admin",
        })
        .eq("id", id);

      if (error) {
        return NextResponse.json(
          {
            error: "Erro ao resolver notificação",
            detalhe: error.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: "Ação inválida" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Erro interno",
        detalhe: error.message,
      },
      { status: 500 }
    );
  }
}