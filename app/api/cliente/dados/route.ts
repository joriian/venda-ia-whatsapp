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

    const { data: clientes, error } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Erro ao buscar clientes" },
        { status: 500 }
      );
    }

    const clientesComServicos = await Promise.all(
      (clientes || []).map(async (cliente: any) => {
        const { data: servicos } = await supabase
          .from("cliente_servicos")
          .select(`
            *,
            servicos_ia (*),
            planos (*)
          `)
          .eq("cliente_id", cliente.id)
          .order("created_at", { ascending: false });

        let servicosFinal = servicos || [];

        if (servicosFinal.length === 0) {
          servicosFinal = [
            {
              id: "principal",
              status: cliente.status,
              plano_id: cliente.plano_id,
              data_inicio: cliente.data_inicio,
              data_expiracao: cliente.data_expiracao,
              servicos_ia: {
                nome: "Serviço principal",
              },
              planos: {
                nome: cliente.plano_id || "Plano",
              },
            },
          ];
        }

        return {
          ...cliente,
          servicos_cliente: servicosFinal,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      clientes: clientesComServicos,
    });
  } catch (error: any) {
    console.log("ERRO ADMIN DADOS:", error.message);

    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}