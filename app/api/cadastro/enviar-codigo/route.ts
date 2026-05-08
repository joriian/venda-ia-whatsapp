import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EVOLUTION_API_URL = String(process.env.EVOLUTION_API_URL || "").replace(
  /\/$/,
  ""
);

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;

function limparTelefone(telefone: string) {
  return String(telefone || "").replace(/\D/g, "");
}

function formatarNumero(telefone: string) {
  const numero = limparTelefone(telefone);

  if (!numero) return "";

  if (numero.startsWith("55")) return numero;

  return `55${numero}`;
}

function gerarCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function senhaForte(senha: string) {
  return (
    senha.length >= 8 &&
    /[A-Z]/.test(senha) &&
    /[a-z]/.test(senha) &&
    /[0-9]/.test(senha) &&
    /[^A-Za-z0-9]/.test(senha)
  );
}

function hashSenha(senha: string) {
  return crypto.createHash("sha256").update(senha).digest("hex");
}

async function buscarInstanciaSistema() {
  const fixa =
    process.env.EVOLUTION_NOTIFY_INSTANCE ||
    process.env.EVOLUTION_DEFAULT_INSTANCE ||
    "";

  if (fixa) return fixa;

  const { data } = await supabase
    .from("instancias_evolution")
    .select("instance_name,status")
    .in("status", ["open", "connected", "conectado"])
    .limit(1)
    .maybeSingle();

  return data?.instance_name || "";
}

async function enviarWhatsapp(params: {
  telefone: string;
  mensagem: string;
}) {
  const instanceName = await buscarInstanciaSistema();

  if (!instanceName) {
    throw new Error("Nenhuma instância conectada para enviar o código.");
  }

  const numero = formatarNumero(params.telefone);

  if (!numero) {
    throw new Error("Telefone inválido.");
  }

  await axios.post(
    `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
    {
      number: numero,
      text: params.mensagem,
    },
    {
      headers: {
        apikey: EVOLUTION_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const nome = String(body.nome || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const telefone = limparTelefone(body.telefone || "");
    const endereco = String(body.endereco || "").trim();
    const documento = String(body.documento || "").trim();

    const senha = String(body.senha || "");
    const confirmarSenha = String(body.confirmarSenha || "");

    const servicoId = body.servicoId || body.servico_id || null;
    const planoId = body.planoId || body.plano_id || null;
    const cupomCodigo = body.cupomCodigo || body.cupom_codigo || null;

    const aceitouTermos = Boolean(body.aceitouTermos || body.aceitou_termos);

    if (!nome || !email || !telefone) {
      return NextResponse.json(
        { error: "Nome, email e WhatsApp são obrigatórios." },
        { status: 400 }
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        { error: "Email inválido." },
        { status: 400 }
      );
    }

    if (telefone.length < 10) {
      return NextResponse.json(
        { error: "WhatsApp inválido. Informe DDD + número." },
        { status: 400 }
      );
    }

    if (!senha || !confirmarSenha) {
      return NextResponse.json(
        { error: "Senha e confirmação são obrigatórias." },
        { status: 400 }
      );
    }

    if (senha !== confirmarSenha) {
      return NextResponse.json(
        { error: "A senha e a confirmação não são iguais." },
        { status: 400 }
      );
    }

    if (!senhaForte(senha)) {
      return NextResponse.json(
        {
          error:
            "A senha precisa ter no mínimo 8 caracteres, maiúscula, minúscula, número e caractere especial.",
        },
        { status: 400 }
      );
    }

    if (!aceitouTermos) {
      return NextResponse.json(
        { error: "Você precisa aceitar os termos de uso." },
        { status: 400 }
      );
    }

    if (!servicoId || !planoId) {
      return NextResponse.json(
        { error: "Selecione um serviço e um plano." },
        { status: 400 }
      );
    }

    const { data: clienteExistente } = await supabase
      .from("clientes_ia_whatsapp")
      .select("id,email,telefone")
      .or(`email.eq.${email},telefone.eq.${telefone}`)
      .maybeSingle();

    if (clienteExistente) {
      return NextResponse.json(
        {
          error:
            "Já existe uma conta com este email ou WhatsApp. Acesse a área do cliente para contratar ou renovar.",
        },
        { status: 409 }
      );
    }

    const codigo = gerarCodigo();
    const expiraEm = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase
      .from("cadastros_pendentes")
      .delete()
      .or(`email.eq.${email},telefone.eq.${telefone}`);

    const { data: pendente, error } = await supabase
      .from("cadastros_pendentes")
      .insert({
        nome,
        email,
        telefone,
        endereco: endereco || null,
        documento: documento || null,

        senha_hash: hashSenha(senha),
        codigo,

        telefone_verificado: false,
        aceitou_termos: aceitouTermos,

        tentativas: 0,
        expira_em: expiraEm,

        servico_id: servicoId,
        plano_id: planoId,
        cupom_codigo: cupomCodigo || null,
      })
      .select("id,telefone,expira_em")
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: "Erro ao criar cadastro pendente.",
          detalhe: error.message,
        },
        { status: 500 }
      );
    }

    const mensagem =
      `Olá ${nome}!\n\n` +
      `Seu código de verificação da Nexora é: ${codigo}\n\n` +
      `Ele expira em 10 minutos. Não compartilhe este código.`;

    await enviarWhatsapp({
      telefone,
      mensagem,
    });

    return NextResponse.json({
      ok: true,
      cadastro_id: pendente.id,
      telefone,
      expira_em: pendente.expira_em,
      message: "Código enviado pelo WhatsApp.",
    });
  } catch (error: any) {
    console.log(
      "ERRO ENVIAR CÓDIGO CADASTRO:",
      error.response?.data || error.message
    );

    return NextResponse.json(
      {
        error: "Erro ao enviar código de verificação.",
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}