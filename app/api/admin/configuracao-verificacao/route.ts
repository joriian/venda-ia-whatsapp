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

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";

async function validarAdmin(req: Request) {
  const token = req.headers.get("x-admin-token");

  if (!token) return null;

  const { data } = await supabase
    .from("admin_users")
    .select("*")
    .eq("session_token", token)
    .eq("ativo", true)
    .maybeSingle();

  return data || null;
}

function tratarErroEvolution(error: any, fallback: string) {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.response?.data ||
    error.message ||
    fallback
  );
}

async function criarInstancia(instanceName: string) {
  try {
    await axios.post(
      `${EVOLUTION_API_URL}/instance/create`,
      {
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
      },
      {
        headers: {
          apikey: EVOLUTION_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    return true;
  } catch (error: any) {
    const status = error.response?.status;
    const mensagem = String(tratarErroEvolution(error, ""));

    if (
      status === 409 ||
      mensagem.toLowerCase().includes("already") ||
      mensagem.toLowerCase().includes("exist")
    ) {
      return true;
    }

    throw new Error(
      typeof mensagem === "string"
        ? mensagem
        : "Erro ao criar instância."
    );
  }
}

async function buscarQRCode(instanceName: string) {
  try {
    const response = await axios.get(
      `${EVOLUTION_API_URL}/instance/connect/${instanceName}`,
      {
        headers: {
          apikey: EVOLUTION_API_KEY,
        },
      }
    );

    const raw =
      response.data?.base64 ||
      response.data?.qrcode ||
      response.data?.code ||
      "";

    if (!raw) return "";

    if (String(raw).startsWith("data:image")) {
      return raw;
    }

    return `data:image/png;base64,${raw}`;
  } catch {
    return "";
  }
}

async function buscarStatus(instanceName: string) {
  try {
    const response = await axios.get(
      `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`,
      {
        headers: {
          apikey: EVOLUTION_API_KEY,
        },
      }
    );

    return (
      response.data?.instance?.state ||
      response.data?.state ||
      response.data?.status ||
      "close"
    );
  } catch {
    return "close";
  }
}

async function excluirInstancia(instanceName: string) {
  if (!instanceName) return;

  try {
    await axios.delete(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
      headers: {
        apikey: EVOLUTION_API_KEY,
      },
    });
  } catch {
    try {
      await axios.delete(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
        headers: {
          apikey: EVOLUTION_API_KEY,
        },
      });
    } catch {}
  }
}

async function buscarConfiguracao() {
  const { data } = await supabase
    .from("configuracoes_sistema")
    .select("*")
    .eq("chave", "whatsapp_verificacao")
    .maybeSingle();

  return data?.valor || {
    instance_name: "",
    numero: "",
    ativo: false,
  };
}

export async function GET(req: Request) {
  const admin = await validarAdmin(req);

  if (!admin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const config = await buscarConfiguracao();

  let status = "close";
  let qrcode = "";

  if (config.instance_name) {
    status = await buscarStatus(config.instance_name);

    if (status !== "open") {
      qrcode = await buscarQRCode(config.instance_name);
    }
  }

  return NextResponse.json({
    ok: true,
    configuracao: {
      ...config,
      status,
      qrcode,
      conectado: status === "open",
    },
  });
}

export async function POST(req: Request) {
  const admin = await validarAdmin(req);

  if (!admin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const instanceName = String(body.instance_name || "").trim();
    const numero = String(body.numero || "").trim();
    const ativo = Boolean(body.ativo);

    if (!instanceName) {
      return NextResponse.json(
        { error: "Informe o nome da instância." },
        { status: 400 }
      );
    }

    if (!numero) {
      return NextResponse.json(
        { error: "Informe o número remetente." },
        { status: 400 }
      );
    }

    if (!EVOLUTION_API_URL) {
      return NextResponse.json(
        { error: "EVOLUTION_API_URL não configurado no EasyPanel." },
        { status: 500 }
      );
    }

    if (!EVOLUTION_API_KEY) {
      return NextResponse.json(
        { error: "EVOLUTION_API_KEY não configurado no EasyPanel." },
        { status: 500 }
      );
    }

    await criarInstancia(instanceName);

    const status = await buscarStatus(instanceName);

    let qrcode = "";

    if (status !== "open") {
      qrcode = await buscarQRCode(instanceName);
    }

    const valor = {
      instance_name: instanceName,
      numero,
      ativo,
    };

    const { error } = await supabase.from("configuracoes_sistema").upsert(
      {
        chave: "whatsapp_verificacao",
        valor,
        atualizado_em: new Date().toISOString(),
      },
      {
        onConflict: "chave",
      }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      configuracao: {
        ...valor,
        status,
        qrcode,
        conectado: status === "open",
      },
    });
  } catch (error: any) {
    console.log("ERRO CONFIG VERIFICAÇÃO:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error:
          typeof error.response?.data === "string"
            ? error.response.data
            : error.response?.data?.message ||
              error.response?.data?.error ||
              error.message ||
              "Erro ao configurar número de verificação.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const admin = await validarAdmin(req);

  if (!admin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const config = await buscarConfiguracao();

    if (config.instance_name && EVOLUTION_API_URL && EVOLUTION_API_KEY) {
      await excluirInstancia(config.instance_name);
    }

    const { error } = await supabase
      .from("configuracoes_sistema")
      .delete()
      .eq("chave", "whatsapp_verificacao");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      configuracao: {
        instance_name: "",
        numero: "",
        ativo: false,
        status: "close",
        qrcode: "",
        conectado: false,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Erro ao excluir número de verificação.",
      },
      { status: 500 }
    );
  }
}