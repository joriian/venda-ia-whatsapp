import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || "NEXORA_SECRET_2026";

async function validarCliente(token: string) {
  if (!token) return null;

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);

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

function limparNumero(numero: string) {
  return String(numero || "").replace(/\D/g, "");
}

function gerarCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function buscarConfiguracaoVerificacao() {
  const { data } = await supabase
    .from("configuracoes_sistema")
    .select("*")
    .eq("chave", "whatsapp_verificacao")
    .maybeSingle();

  return data?.valor || null;
}

async function enviarMensagemEvolution(params: {
  instanceName: string;
  numeroDestino: string;
  mensagem: string;
}) {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("EVOLUTION_API_URL ou EVOLUTION_API_KEY não configurado.");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/message/sendText/${params.instanceName}`;

  await axios.post(
    url,
    {
      number: params.numeroDestino,
      text: params.mensagem,
    },
    {
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
    }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const cliente = await validarCliente(body.token);

    if (!cliente) {
      return NextResponse.json(
        { error: "Sessão inválida" },
        { status: 401 }
      );
    }

    const telefone = limparNumero(body.telefone || cliente.telefone);

    if (!telefone || telefone.length < 10) {
      return NextResponse.json(
        { error: "Telefone inválido." },
        { status: 400 }
      );
    }

    const config = await buscarConfiguracaoVerificacao();

    if (!config?.ativo || !config?.instance_name) {
      return NextResponse.json(
        {
          error:
            "Número de verificação não configurado no painel administrativo.",
        },
        { status: 400 }
      );
    }

    const codigo = gerarCodigo();

    const expiraEm = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase
      .from("clientes_ia_whatsapp")
      .update({
        telefone,
        codigo_verificacao: codigo,
        codigo_verificacao_expira_em: expiraEm,
        telefone_verificado: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cliente.id);

    await enviarMensagemEvolution({
      instanceName: config.instance_name,
      numeroDestino: telefone,
      mensagem: `Seu código de verificação Nexora é: ${codigo}. Ele expira em 10 minutos.`,
    });

    return NextResponse.json({
      ok: true,
      message: "Código enviado pelo WhatsApp.",
    });
  } catch (error: any) {
    console.log(
      "ERRO ENVIAR CÓDIGO:",
      error.response?.data || error.message
    );

    return NextResponse.json(
      {
        error: "Erro ao enviar código.",
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}