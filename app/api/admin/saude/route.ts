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

export async function GET(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const busca = searchParams.get("busca") || "";
    const filtro = searchParams.get("filtro") || "todos";

    let query = supabase
      .from("vw_saude_automacoes")
      .select("*")
      .order("ultimo_evento_em", { ascending: false, nullsFirst: false })
      .limit(200);

    if (busca.trim()) {
      query = query.or(
        `cliente_nome.ilike.%${busca}%,cliente_email.ilike.%${busca}%,cliente_telefone.ilike.%${busca}%,servico_nome.ilike.%${busca}%,instance_name.ilike.%${busca}%,numero.ilike.%${busca}%`
      );
    }

    if (filtro === "offline") {
      query = query.not("instance_status", "in", '("open","connected","conectado")');
    }

    if (filtro === "online") {
      query = query.in("instance_status", ["open", "connected", "conectado"]);
    }

    if (filtro === "erro") {
      query = query.gt("erros_hoje", 0);
    }

    if (filtro === "sem_evento") {
      query = query.is("ultimo_evento_em", null);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          error: "Erro ao buscar saúde das automações",
          detalhe: error.message,
        },
        { status: 500 }
      );
    }

    const itens = data || [];

    const resumo = {
      total: itens.length,
      online: itens.filter((i: any) =>
        ["open", "connected", "conectado"].includes(
          String(i.instance_status || "").toLowerCase()
        )
      ).length,
      offline: itens.filter(
        (i: any) =>
          !["open", "connected", "conectado"].includes(
            String(i.instance_status || "").toLowerCase()
          )
      ).length,
      com_erro_hoje: itens.filter((i: any) => Number(i.erros_hoje || 0) > 0)
        .length,
      sem_evento: itens.filter((i: any) => !i.ultimo_evento_em).length,
      mensagens_hoje: itens.reduce(
        (acc: number, i: any) => acc + Number(i.mensagens_hoje || 0),
        0
      ),
    };

    return NextResponse.json({
      ok: true,
      resumo,
      automacoes: itens,
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