import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EVOLUTION_API_URL = String(process.env.EVOLUTION_API_URL || "").replace(
  /\/$/,
  ""
);

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;

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

async function buscarInstancia(instanceName: string) {
  const { data } = await supabase
    .from("instancias_evolution")
    .select("*")
    .eq("instance_name", instanceName)
    .maybeSingle();

  return data;
}

function pegarQrCode(data: any) {
  return (
    data?.qrcode?.base64 ||
    data?.qrcode ||
    data?.base64 ||
    data?.code ||
    data?.qr ||
    data?.data?.qrcode ||
    data?.data?.base64 ||
    ""
  );
}

function conectado(status: string) {
  const s = String(status || "").toLowerCase();
  return s === "open" || s === "connected" || s === "conectado";
}

async function salvarStatus(params: {
  instancia: any;
  status: string;
  qrcode?: string | null;
  numero?: string | null;
  nome?: string | null;
}) {
  await supabase
    .from("instancias_evolution")
    .update({
      status: params.status,
      numero: params.numero || null,
      nome: params.nome || null,
      updated_at: new Date().toISOString(),
    })
    .eq("instance_name", params.instancia.instance_name);

  await supabase
    .from("cliente_servicos")
    .update({
      evolution_status: params.status,
      evolution_qrcode: params.qrcode || null,
      evolution_numero: params.numero || null,
      updated_at: new Date().toISOString(),
    })
    .eq("cliente_id", params.instancia.cliente_id)
    .eq("servico_id", params.instancia.servico_id);

  await supabase.from("evolution_qrcodes").upsert(
    {
      cliente_id: params.instancia.cliente_id,
      servico_id: params.instancia.servico_id,
      cliente_servico_id: params.instancia.cliente_servico_id,
      instance_name: params.instancia.instance_name,
      qrcode: params.qrcode || null,
      status: params.status,
      numero: params.numero || null,
      nome: params.nome || null,
      atualizado_em: new Date().toISOString(),
    },
    {
      onConflict: "instance_name",
    }
  );
}

async function consultarStatus(instanceName: string) {
  const response = await axios.get(
    `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`,
    {
      headers: {
        apikey: EVOLUTION_API_KEY,
      },
    }
  );

  const status =
    response.data?.instance?.state ||
    response.data?.state ||
    response.data?.status ||
    "connecting";

  return {
    status,
    data: response.data,
  };
}

async function gerarQrCode(instanceName: string) {
  const response = await axios.get(
    `${EVOLUTION_API_URL}/instance/connect/${instanceName}`,
    {
      headers: {
        apikey: EVOLUTION_API_KEY,
      },
    }
  );

  return {
    qrcode: pegarQrCode(response.data),
    data: response.data,
  };
}

async function reiniciarInstancia(instanceName: string) {
  const response = await axios.put(
    `${EVOLUTION_API_URL}/instance/restart/${instanceName}`,
    {},
    {
      headers: {
        apikey: EVOLUTION_API_KEY,
      },
    }
  );

  return response.data;
}

async function desconectarInstancia(instanceName: string) {
  const response = await axios.delete(
    `${EVOLUTION_API_URL}/instance/logout/${instanceName}`,
    {
      headers: {
        apikey: EVOLUTION_API_KEY,
      },
    }
  );

  return response.data;
}

export async function POST(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();

    const instanceName = body.instance_name;
    const acao = body.acao;

    if (!instanceName) {
      return NextResponse.json(
        { error: "Nome da instância é obrigatório" },
        { status: 400 }
      );
    }

    const instancia = await buscarInstancia(instanceName);

    if (!instancia) {
      return NextResponse.json(
        { error: "Instância não encontrada no banco" },
        { status: 404 }
      );
    }

    if (acao === "status") {
      const status = await consultarStatus(instanceName);

      await salvarStatus({
        instancia,
        status: status.status,
      });

      return NextResponse.json({
        ok: true,
        acao,
        instanceName,
        status: status.status,
        conectado: conectado(status.status),
        data: status.data,
      });
    }

    if (acao === "qrcode") {
      const qr = await gerarQrCode(instanceName);

      await salvarStatus({
        instancia,
        status: "qrcode",
        qrcode: qr.qrcode,
      });

      return NextResponse.json({
        ok: true,
        acao,
        instanceName,
        status: "qrcode",
        qrcode: qr.qrcode,
        data: qr.data,
      });
    }

    if (acao === "reiniciar") {
      const data = await reiniciarInstancia(instanceName);

      await salvarStatus({
        instancia,
        status: "connecting",
      });

      return NextResponse.json({
        ok: true,
        acao,
        instanceName,
        status: "connecting",
        data,
      });
    }

    if (acao === "desconectar") {
      const data = await desconectarInstancia(instanceName);

      await salvarStatus({
        instancia,
        status: "close",
        qrcode: null,
      });

      return NextResponse.json({
        ok: true,
        acao,
        instanceName,
        status: "close",
        data,
      });
    }

    return NextResponse.json(
      { error: "Ação inválida" },
      { status: 400 }
    );
  } catch (error: any) {
    console.log("ERRO ADMIN EVOLUTION:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error: "Erro ao controlar instância",
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}