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

  return (
    primeiroServico || {
      id: "servico_principal",
      nome: "Serviço principal",
      descricao: "Serviço contratado",
      ativo: true,
    }
  );
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
  const { data, error } = await supabase
    .from("pagamentos_ia_whatsapp")
    .select("*")
    .eq("cliente_id", cliente.id)
    .order("criado_em", { ascending: false })
    .limit(20);

  if (!error && data && data.length > 0) {
    return data;
  }

  return (servicosCliente || []).map((item: any) => ({
    id: `fallback-${item.id}`,
    cliente_id: cliente.id,
    mercado_pago_id: null,
    status: item.status || cliente.status || "aguardando_pagamento",
    valor: item.planos?.valor || 0,
    criado_em: item.data_inicio || item.created_at || cliente.data_inicio,
    plano_id: item.plano_id || cliente.plano_id,
    payment_id: "Registro do plano",
    cupom_codigo: cliente.cupom_codigo || null,
    desconto_valor: 0,
    valor_original: item.planos?.valor || 0,
  }));
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

    const { data: servicos } = await supabase
      .from("cliente_servicos")
      .select(`
        *,
        servicos_ia (*),
        planos (*)
      `)
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: false });

    servicosCliente = servicos || [];

    if (servicosCliente.length === 0) {
      const plano = await buscarPlano(cliente.plano_id);
      const servico = await buscarServico(cliente.servico_id, plano);

      servicosCliente = [
        {
          id: "principal",
          cliente_id: cliente.id,
          servico_id: cliente.servico_id || servico?.id || "servico_principal",
          plano_id: cliente.plano_id || plano?.id || "plano_principal",
          status: cliente.status || "aguardando_pagamento",
          data_inicio: cliente.data_inicio,
          data_expiracao: cliente.data_expiracao,
          created_at: cliente.criado_em || cliente.created_at || cliente.data_inicio,
          servicos_ia: servico,
          planos: plano,
        },
      ];
    }

    const pagamentos = await buscarPagamentos(cliente, servicosCliente);

    const { data: catalogoRaw } = await supabase
      .from("servicos_ia")
      .select(`
        *,
        planos (*)
      `)
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    const catalogo = (catalogoRaw || []).map((servico: any) => ({
      ...servico,
      planos: (servico.planos || []).sort((a: any, b: any) => {
        return Number(a.ordem || 0) - Number(b.ordem || 0);
      }),
    }));

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