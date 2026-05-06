import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validarCliente(token: string) {
  const { data: cliente } = await supabase
    .from("clientes_ia_whatsapp")
    .select("*")
    .eq("session_token", token)
    .maybeSingle();

  if (!cliente) return null;

  const expira = cliente.session_expires_at
    ? new Date(cliente.session_expires_at)
    : null;

  if (!expira || expira < new Date()) return null;

  return cliente;
}

async function buscarPlano(planoId: any) {
  if (!planoId) return null;

  const planoTexto = String(planoId);

  const { data: planoPorId } = await supabase
    .from("planos")
    .select("*")
    .eq("id", planoTexto)
    .maybeSingle();

  if (planoPorId) return planoPorId;

  const { data: planoPorNome } = await supabase
    .from("planos")
    .select("*")
    .ilike("nome", `%${planoTexto}%`)
    .maybeSingle();

  if (planoPorNome) return planoPorNome;

  return {
    id: planoTexto,
    nome: planoTexto,
    valor: 0,
    meses: 1,
    ativo: true,
  };
}

async function buscarServico(servicoId: any, plano: any) {
  if (servicoId) {
    const { data: servico } = await supabase
      .from("servicos_ia")
      .select("*")
      .eq("id", servicoId)
      .maybeSingle();

    if (servico) return servico;
  }

  if (plano?.servico_id) {
    const { data: servicoDoPlano } = await supabase
      .from("servicos_ia")
      .select("*")
      .eq("id", plano.servico_id)
      .maybeSingle();

    if (servicoDoPlano) return servicoDoPlano;
  }

  const { data: primeiroServico } = await supabase
    .from("servicos_ia")
    .select("*")
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (primeiroServico) return primeiroServico;

  return {
    id: "servico_principal",
    nome: "Serviço principal",
    descricao: "Serviço contratado",
    ativo: true,
  };
}

async function buscarStatusEvolution(clienteId: string) {
  const instanceName = `cliente_${clienteId}`.replace(/-/g, "");

  try {
    const response = await axios.get(
      `${process.env.EVOLUTION_API_URL}/instance/fetchInstances`,
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
        },
      }
    );

    const lista = Array.isArray(response.data)
      ? response.data
      : response.data?.instances || [];

    const encontrada = lista.find((item: any) => {
      const nome =
        item?.instanceName ||
        item?.instance?.instanceName ||
        item?.name ||
        item?.instance;

      return nome === instanceName;
    });

    if (!encontrada) {
      return {
        instance_name: instanceName,
        status: "desconectado",
        conectado: false,
      };
    }

    const status =
      encontrada?.connectionStatus ||
      encontrada?.status ||
      encontrada?.instance?.state ||
      encontrada?.state ||
      "desconectado";

    const conectado =
      status === "open" ||
      status === "connected" ||
      status === "conectado";

    return {
      instance_name: instanceName,
      status: conectado ? "open" : status,
      conectado,
    };
  } catch {
    return {
      instance_name: instanceName,
      status: "desconectado",
      conectado: false,
    };
  }
}

async function buscarPagamentos(cliente: any, servicosCliente: any[]) {
  let pagamentos: any[] = [];

  try {
    const { data } = await supabase
      .from("pagamentos_ia_whatsapp")
      .select("*")
      .eq("cliente_id", cliente.id);

    pagamentos = data || [];
  } catch {
    pagamentos = [];
  }

  if (pagamentos.length === 0) {
    pagamentos = (servicosCliente || []).map((item: any) => ({
      id: `fallback-${item.id}`,
      criado_em: item.data_inicio || item.created_at || cliente.data_inicio,
      status: item.status || cliente.status || "ativo",
      valor: item.planos?.valor || 0,
      cupom_codigo: cliente.cupom_codigo || null,
      payment_id: "Registro do plano ativo",
      plano_nome: item.planos?.nome || item.plano_id || cliente.plano_id,
    }));
  }

  return pagamentos;
}

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token obrigatório" }, { status: 401 });
    }

    const cliente = await validarCliente(token);

    if (!cliente) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    let servicosCliente: any[] = [];

    try {
      const { data } = await supabase
        .from("cliente_servicos")
        .select(`
          *,
          servicos_ia (*),
          planos (*)
        `)
        .eq("cliente_id", cliente.id);

      servicosCliente = data || [];
    } catch {
      servicosCliente = [];
    }

    if (servicosCliente.length === 0) {
      const plano = await buscarPlano(cliente.plano_id);
      const servico = await buscarServico(cliente.servico_id, plano);

      servicosCliente = [
        {
          id: "principal",
          cliente_id: cliente.id,
          servico_id: cliente.servico_id || servico?.id || "servico_principal",
          plano_id: cliente.plano_id || plano?.id || "plano_principal",
          status: cliente.status || "ativo",
          data_inicio: cliente.data_inicio,
          data_expiracao: cliente.data_expiracao,
          created_at: cliente.criado_em || cliente.created_at || cliente.data_inicio,
          servicos_ia: servico,
          planos: plano,
        },
      ];
    }

    const pagamentos = await buscarPagamentos(cliente, servicosCliente);

    let catalogo: any[] = [];

    try {
      const { data } = await supabase
        .from("servicos_ia")
        .select(`
          *,
          planos (*)
        `)
        .eq("ativo", true);

      catalogo = data || [];
    } catch {
      catalogo = [];
    }

    const instancia = await buscarStatusEvolution(cliente.id);

    return NextResponse.json({
      ok: true,
      cliente,
      servicosCliente,
      pagamentos,
      catalogo,
      instancia,
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