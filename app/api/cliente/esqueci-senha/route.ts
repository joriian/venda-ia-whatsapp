import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EVOLUTION_API_URL = String(
  process.env.EVOLUTION_API_URL || ""
).replace(/\/$/, "");

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;

function limparNumero(numero: string) {
  return String(numero || "").replace(/\D/g, "");
}

function formatarNumero(numero: string) {
  const n = limparNumero(numero);

  if (n.startsWith("55")) return n;

  return `55${n}`;
}

function gerarCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000));
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

async function enviarWhatsapp({
  telefone,
  mensagem,
}: {
  telefone: string;
  mensagem: string;
}) {
  const instancia = await buscarInstanciaSistema();

  if (!instancia) {
    throw new Error(
      "Nenhuma instância WhatsApp disponível para envio."
    );
  }

  await axios.post(
    `${EVOLUTION_API_URL}/message/sendText/${instancia}`,
    {
      number: formatarNumero(telefone),
      text: mensagem,
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

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          error: "Informe o email da conta.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: cliente } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (!cliente) {
      return NextResponse.json(
        {
          error:
            "Nenhuma conta encontrada com este email.",
        },
        {
          status: 404,
        }
      );
    }

    if (!cliente.telefone) {
      return NextResponse.json(
        {
          error:
            "Esta conta não possui WhatsApp cadastrado.",
        },
        {
          status: 400,
        }
      );
    }

    const codigo = gerarCodigo();

    const expiraEm = new Date(
      Date.now() + 10 * 60 * 1000
    ).toISOString();

    await supabase
      .from("recuperacao_senha")
      .update({
        usado: true,
      })
      .eq("cliente_id", cliente.id)
      .eq("usado", false);

    const { error } = await supabase
      .from("recuperacao_senha")
      .insert({
        cliente_id: cliente.id,
        telefone: cliente.telefone,
        codigo,
        usado: false,
        tentativas: 0,
        expira_em: expiraEm,
      });

    if (error) {
      return NextResponse.json(
        {
          error:
            "Erro ao gerar recuperação de senha.",
          detalhe: error.message,
        },
        {
          status: 500,
        }
      );
    }

    const mensagem =
      `Olá ${cliente.nome || ""}!\n\n` +
      `Seu código de recuperação da Nexora é:\n\n` +
      `${codigo}\n\n` +
      `Ele expira em 10 minutos.\n\n` +
      `Se você não solicitou a recuperação, ignore esta mensagem.`;

    await enviarWhatsapp({
      telefone: cliente.telefone,
      mensagem,
    });

    return NextResponse.json({
      ok: true,
      message:
        "Código enviado para o WhatsApp cadastrado.",
    });
  } catch (error: any) {
    console.log(
      "ERRO ESQUECI SENHA:",
      error.response?.data || error.message
    );

    return NextResponse.json(
      {
        error:
          "Erro ao solicitar recuperação de senha.",
        detalhe:
          error.response?.data || error.message,
      },
      {
        status: 500,
      }
    );
  }
}