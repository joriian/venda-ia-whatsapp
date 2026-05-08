import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function hashSenha(senha: string) {
  return crypto
    .createHash("sha256")
    .update(senha)
    .digest("hex");
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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const codigo = String(body.codigo || "").trim();

    const novaSenha = String(body.novaSenha || "");
    const confirmarSenha = String(
      body.confirmarSenha || ""
    );

    if (!email) {
      return NextResponse.json(
        {
          error: "Informe o email.",
        },
        {
          status: 400,
        }
      );
    }

    if (!codigo || codigo.length < 4) {
      return NextResponse.json(
        {
          error: "Código inválido.",
        },
        {
          status: 400,
        }
      );
    }

    if (!novaSenha || !confirmarSenha) {
      return NextResponse.json(
        {
          error:
            "Informe a nova senha e confirmação.",
        },
        {
          status: 400,
        }
      );
    }

    if (novaSenha !== confirmarSenha) {
      return NextResponse.json(
        {
          error:
            "A senha e a confirmação não são iguais.",
        },
        {
          status: 400,
        }
      );
    }

    if (!senhaForte(novaSenha)) {
      return NextResponse.json(
        {
          error:
            "A senha precisa ter no mínimo 8 caracteres, letra maiúscula, minúscula, número e caractere especial.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: cliente } = await supabase
      .from("clientes_ia_whatsapp")
      .select("id,email")
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

    const { data: recuperacao } = await supabase
      .from("recuperacao_senha")
      .select("*")
      .eq("cliente_id", cliente.id)
      .eq("usado", false)
      .order("criado_em", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (!recuperacao) {
      return NextResponse.json(
        {
          error:
            "Nenhuma solicitação de recuperação encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      Number(recuperacao.tentativas || 0) >= 5
    ) {
      return NextResponse.json(
        {
          error:
            "Limite de tentativas excedido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      new Date(recuperacao.expira_em) <
      new Date()
    ) {
      return NextResponse.json(
        {
          error:
            "Código expirado. Solicite um novo código.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      String(recuperacao.codigo) !== codigo
    ) {
      await supabase
        .from("recuperacao_senha")
        .update({
          tentativas:
            Number(recuperacao.tentativas || 0) +
            1,
        })
        .eq("id", recuperacao.id);

      return NextResponse.json(
        {
          error: "Código incorreto.",
        },
        {
          status: 400,
        }
      );
    }

    const senhaHash = hashSenha(novaSenha);

    const { error: updateError } =
      await supabase
        .from("clientes_ia_whatsapp")
        .update({
          senha_hash: senhaHash,
        })
        .eq("id", cliente.id);

    if (updateError) {
      return NextResponse.json(
        {
          error:
            "Erro ao atualizar senha.",
          detalhe: updateError.message,
        },
        {
          status: 500,
        }
      );
    }

    await supabase
      .from("recuperacao_senha")
      .update({
        usado: true,
        usado_em: new Date().toISOString(),
      })
      .eq("id", recuperacao.id);

    return NextResponse.json({
      ok: true,
      message:
        "Senha redefinida com sucesso.",
    });
  } catch (error: any) {
    console.log(
      "ERRO REDEFINIR SENHA:",
      error.message
    );

    return NextResponse.json(
      {
        error:
          "Erro ao redefinir senha.",
        detalhe: error.message,
      },
      {
        status: 500,
      }
    );
  }
}