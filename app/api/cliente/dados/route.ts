import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || "NEXORA_SECRET_2026";

async function validarCliente(token: string) {
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (!decoded?.id || decoded?.tipo !== "cliente") {
      return null;
    }

    const { data: cliente } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .eq("id", decoded.id)
      .maybeSingle();

    return cliente || null;
  } catch {
    return null;
  }
}

async function buscarPagamentos(clienteId: string) {
  const { data } = await supabase
    .from("pagamentos_ia_whatsapp")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("criado_em", { ascending: false })
    .limit(20);

  return data || [];
}

async function buscarCatalogo() {
  const { data } = await supabase
    .from("servicos_ia")
    .select(`
      *,
      planos (*)
    `)
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  return (data || []).map((servico: any) => ({
    ...servico,
    planos: (servico.planos || []).sort((a: any, b: any) => {
      return Number(a.ordem || 0) - Number(b.ordem || 0);
    }),
  }));
}

async function buscarServicosCliente(cliente: any) {
  const { data: servicos } = await supabase
    .from("cliente_servicos")
    .select(`
      *,
      servicos_ia (*),
      planos (*)
    `)
    .eq("cliente_id", cliente.id)
    .order("created_at", { ascending: false });

  if (servicos && servicos.length > 0) {
    return servicos;
  }

  if (!cliente.servico_id || !cliente.plano_id) {
    return [];
  }

  const { data: servico } = await supabase
    .from("servicos_ia")
    .select("*")
    .eq("id", cliente.servico_id)
    .maybeSingle();

  const { data: plano } = await supabase
    .from("planos")
    .select("*")
    .eq("id", cliente.plano_id)
    .maybeSingle();

  if (!servico || !plano) {
    return [];
  }

  const { data: novoVinculo } = await supabase
    .from("cliente_servicos")
    .upsert(
      {
        cliente_id: cliente.id,
        servico_id: servico.id,
        plano_id: plano.id,
        status: cliente.status || "ativo",
        data_inicio: cliente.data_inicio || null,
        data_expiracao: cliente.data_expiracao || null,
        evolution_status: "desconectado",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "cliente_id,servico_id",
      }
    )
    .select(`
      *,
      servicos_ia (*),
      planos (*)
    `)
    .single();

  return novoVinculo ? [novoVinculo] : [];
}

async function buscarQr(instanceName: string) {
  if (!instanceName) return null;

  const { data } = await supabase
    .from("evolution_qrcodes")
    .select("*")
    .eq("instance_name", instanceName)
    .maybeSingle();

  return data || null;
}

async function buscarInstancia(instanceName: string) {
  if (!instanceName) return null;

  const { data } = await supabase
    .from("instancias_evolution")
    .select("*")
    .eq("instance_name", instanceName)
    .maybeSingle();

  return data || null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = body.token;

    if (!token) {
      return NextResponse.json(
        { error: "Token obrigatório" },
        { status: 401 }
      );
    }

    const cliente = await validarCliente(token);

    if (!cliente) {
      return NextResponse.json(
        { error: "Sessão inválida" },
        { status: 401 }
      );
    }

    const servicosClienteRaw = await buscarServicosCliente(cliente);

    const servicosCliente = await Promise.all(
      servicosClienteRaw.map(async (item: any) => {
        const qrcode = await buscarQr(item.instance_name);
        const instancia = await buscarInstancia(item.instance_name);

        const status =
          instancia?.status ||
          qrcode?.status ||
          item.evolution_status ||
          "desconectado";

        return {
          ...item,
          evolution: {
            instance_name: item.instance_name,
            status,
            conectado:
              status === "open" ||
              status === "connected" ||
              status === "conectado",
            qrcode: qrcode?.qrcode || item.evolution_qrcode || null,
            numero:
              qrcode?.numero ||
              instancia?.numero ||
              item.evolution_numero ||
              null,
            nome: qrcode?.nome || instancia?.nome || null,
            atualizado_em:
              qrcode?.atualizado_em ||
              instancia?.updated_at ||
              item.updated_at ||
              null,
          },
        };
      })
    );

    const pagamentos = await buscarPagamentos(cliente.id);
    const catalogo = await buscarCatalogo();

    return NextResponse.json({
      ok: true,
      cliente,
      servicosCliente,
      pagamentos,
      catalogo,
    });
  } catch (error: any) {
    console.log("ERRO CLIENTE DADOS:", error.message);

    return NextResponse.json(
      {
        error: "Erro ao carregar dados do cliente",
        detalhe: error.message,
      },
      { status: 500 }
    );
  }
}