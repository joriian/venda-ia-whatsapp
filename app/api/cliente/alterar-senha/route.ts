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

export async function POST(req: Request) {
  try {
    const { token, senhaAtual, novaSenha, confirmarSenha } = await req.json();

    if (!token || !senhaAtual || !novaSenha || !confirmarSenha) {
      return NextResponse.json(
        { error: "Preencha todos os campos" },
        { status: 400 }
      );
    }

    const cliente = await validarCliente(token);

    if (!cliente) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    if (String(cliente.senha || "") !== String(senhaAtual)) {
      return NextResponse.json(
        { error: "Senha atual incorreta" },
        { status: 400 }
      );
    }

    if (novaSenha !== confirmarSenha) {
      return NextResponse.json(
        { error: "A nova senha e a confirmação não são iguais" },
        { status: 400 }
      );
    }

    if (!senhaForte(novaSenha)) {
      return NextResponse.json(
        {
          error:
            "A senha deve ter no mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.",
        },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("clientes_ia_whatsapp")
      .update({
        senha: novaSenha,
      })
      .eq("id", cliente.id);

    if (error) {
      return NextResponse.json(
        { error: "Erro ao alterar senha" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.log("ERRO ALTERAR SENHA CLIENTE:", error.message);

    return NextResponse.json(
      { error: "Erro ao alterar senha" },
      { status: 500 }
    );
  }
}