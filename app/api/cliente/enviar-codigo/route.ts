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

function gerarCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function limparTelefone(telefone: string) {
  return String(telefone || "").replace(/\D/g, "");
}

function formatarJid(telefone: string) {
  const numero = limparTelefone(telefone);

  if (numero.endsWith("@s.whatsapp.net")) return numero;

  if (numero.startsWith("55")) {
    return `${numero}@s.whatsapp.net`;
  }

  return `55${numero}@s.whatsapp.net`;
}

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

async function buscarInstanciaSistema() {
  const instancia =
    process.env.EVOLUTION_NOTIFY_INSTANCE ||
    process.env.EVOLUTION_DEFAULT_INSTANCE ||
    "";

  if (instancia) return instancia;

  const { data } = await supabase
    .from("instancias_evolution")
    .select("instance_name,status")
    .in("status", ["open", "connected", "conectado"])
    .limit(1)
    .maybeSingle();

  return data?.instance_name || "";
}

async function enviarWhatsapp(params: {
  instanceName: string;
  telefone: string;
  mensagem: string;
}) {
  const jid = formatarJid(params.telefone);

  const tentativas = [
    {
      url: `${EVOLUTION_API_URL}/message/sendText/${params.instanceName}`,
      body: {
        number: jid,
        text: params.mensagem,
      },
    },
    {
      url: `${EVOLUTION_API_URL}/message/sendText/${params.instanceName}`,
      body: {
        number: limparTelefone(params.telefone).startsWith("55")
          ? limparTelefone(params.telefone)
          : `55${limparTelefone(params.telefone)}`,
        text: params.mensagem,
      },
    },
  ];

  let ultimoErro: any = null;

  for (const tentativa of tentativas) {
    try {
      const response = await axios.post(tentativa.url, tentativa.body, {
        headers: {
          apikey: EVOLUTION_API_KEY,
          "Content-Type": "application/json",
        },
      });

      return response.data;
    } catch (error: any) {
      ultimoErro = error.response?.data || error.message;
    }
  }

  throw new Error(JSON.stringify(ultimoErro));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const token = body.token;
    const telefoneInformado = body.telefone;

    if (!token) {
      return NextResponse.json({ error: "Token obrigatório" }, { status: 401 });
    }

    const cliente = await validarCliente(token);

    if (!cliente) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    const telefone = limparTelefone(telefoneInformado || cliente.telefone);

    if (!telefone || telefone.length < 10) {
      return NextResponse.json(
        { error: "Telefone inválido. Informe DDD + número." },
        { status: 400 }
      );
    }

    const codigo = gerarCodigo();
    const expiraEm = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase
      .from("codigos_verificacao_cliente")
      .update({
        usado: true,
        usado_em: new Date().toISOString(),
      })
      .eq("cliente_id", cliente.id)
      .eq("usado", false);

    const { error: codigoError } = await supabase
      .from("codigos_verificacao_cliente")
      .insert({
        cliente_id: cliente.id,
        telefone,
        codigo,
        usado: false,
        tentativas: 0,
        expira_em: expiraEm,
      });

    if (codigoError) {
      return NextResponse.json(
        {
          error: "Erro ao gerar código",
          detalhe: codigoError.message,
        },
        { status: 500 }
      );
    }

    await supabase
      .from("clientes_ia_whatsapp")
      .update({
        telefone,
        telefone_verificado: false,
        telefone_verificado_em: null,
      })
      .eq("id", cliente.id);

    const instanceName = await buscarInstanciaSistema();

    if (!instanceName) {
      return NextResponse.json(
        {
          error:
            "Nenhuma instância conectada disponível para enviar o código. Conecte uma instância no painel admin.",
        },
        { status: 400 }
      );
    }

    const mensagem = `Seu código de verificação é: ${codigo}\n\nEle expira em 10 minutos.`;

    await enviarWhatsapp({
      instanceName,
      telefone,
      mensagem,
    });

    return NextResponse.json({
      ok: true,
      message: "Código enviado pelo WhatsApp.",
      telefone,
      expira_em: expiraEm,
    });
  } catch (error: any) {
    console.log("ERRO ENVIAR CÓDIGO:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error: "Erro ao enviar código",
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}