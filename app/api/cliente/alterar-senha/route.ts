import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function senhaForte(senha: string) {
  const temMaiuscula = /[A-Z]/.test(senha);
  const temMinuscula = /[a-z]/.test(senha);
  const temNumero = /[0-9]/.test(senha);
  const temEspecial = /[^A-Za-z0-9]/.test(senha);
  const tamanhoOk = senha.length >= 8;

  return tamanhoOk && temMaiuscula && temMinuscula && temNumero && temEspecial;
}

async function validarSessao(clienteId: string, token: string) {
  if (!clienteId || !token) return false;

  const { data: cliente } = await supabase
    .from("clientes_ia_whatsapp")
    .select("*")
    .eq("id", clienteId)
    .eq("session_token", token)
    .maybeSingle();

  if (!cliente) return false;

  const expira = cliente.session_expires_at
    ? new Date(cliente.session_expires_at)
    : null;

  if (!expira || expira < new Date()) return false;

  return cliente;
}

export async function POST(req: Request) {
  try {
    const { clienteId, token, senhaAtual, novaSenha } = await req.json();

    if (!clienteId || !token || !senhaAtual || !novaSenha) {
      return NextResponse.json(
        { error: "Preencha todos os campos" },
        { status: 400 }
      );
    }

    const cliente = await validarSessao(clienteId, token);

    if (!cliente) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    const novaSenhaTratada = String(novaSenha).trim();

    if (!senhaForte(novaSenhaTratada)) {
      return NextResponse.json(
        {
          error:
            "A senha deve ter no mínimo 8 caracteres, com letra maiúscula, minúscula, número e caractere especial.",
        },
        { status: 400 }
      );
    }

    if (String(cliente.senha || "").trim() !== String(senhaAtual || "").trim()) {
      return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 });
    }

    await supabase
      .from("clientes_ia_whatsapp")
      .update({ senha: novaSenhaTratada })
      .eq("id", clienteId);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.log("ERRO ALTERAR SENHA:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}