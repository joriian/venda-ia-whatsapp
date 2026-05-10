import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET =
  process.env.JWT_SECRET || "NEXORA_SECRET_2026";

async function validarCliente(token: string) {
  if (!token) return null;

  try {
    const decoded: any = jwt.verify(
      token,
      JWT_SECRET
    );

    if (decoded?.id) {
      const { data } = await supabase
        .from("clientes_ia_whatsapp")
        .select("*")
        .eq("id", decoded.id)
        .maybeSingle();

      if (data) return data;
    }
  } catch {}

  const { data } = await supabase
    .from("clientes_ia_whatsapp")
    .select("*")
    .eq("session_token", token)
    .maybeSingle();

  return data || null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const token = body.token;

    const cliente = await validarCliente(token);

    if (!cliente) {
      return NextResponse.json(
        {
          error: "Sessão inválida",
        },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("creditos_cliente")
      .select(`
        *,
        cliente_servicos (
          id,
          status,
          instance_name,
          servico_id,
          plano_id
        )
      `)
      .eq("cliente_id", cliente.id)
      .order("criado_em", {
        ascending: false,
      });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      );
    }

    const totalDisponivel = (data || [])
      .filter((c: any) => !c.utilizado)
      .reduce((acc: number, item: any) => {
        return (
          acc + Number(item.valor_credito || 0)
        );
      }, 0);

    const totalUtilizado = (data || [])
      .filter((c: any) => c.utilizado)
      .reduce((acc: number, item: any) => {
        return (
          acc + Number(item.valor_credito || 0)
        );
      }, 0);

    return NextResponse.json({
      ok: true,
      creditos: data || [],
      resumo: {
        total_disponivel:
          Number(
            totalDisponivel.toFixed(2)
          ),
        total_utilizado:
          Number(
            totalUtilizado.toFixed(2)
          ),
      },
    });
  } catch (error: any) {
    console.log(
      "ERRO CREDITOS CLIENTE:",
      error.message
    );

    return NextResponse.json(
      {
        error:
          "Erro ao carregar créditos",
      },
      { status: 500 }
    );
  }
}