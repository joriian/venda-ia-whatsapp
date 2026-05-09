import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function gerarTokenSessao() {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const cadastroId =
      body.cadastroId || body.cadastro_id;

    const codigo = String(
      body.codigo || ""
    ).trim();

    if (!cadastroId) {
      return NextResponse.json(
        {
          error:
            "Cadastro pendente não encontrado.",
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

    const { data: pendente } =
      await supabase
        .from("cadastros_pendentes")
        .select("*")
        .eq("id", cadastroId)
        .maybeSingle();

    if (!pendente) {
      return NextResponse.json(
        {
          error:
            "Cadastro pendente não encontrado ou expirado.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      pendente.telefone_verificado
    ) {
      return NextResponse.json({
        ok: true,
        message:
          "Telefone já verificado.",
      });
    }

    if (
      new Date(pendente.expira_em) <
      new Date()
    ) {
      return NextResponse.json(
        {
          error:
            "Código expirado. Envie um novo código.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      Number(
        pendente.tentativas || 0
      ) >= 5
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
      String(pendente.codigo) !==
      codigo
    ) {
      await supabase
        .from("cadastros_pendentes")
        .update({
          tentativas:
            Number(
              pendente.tentativas || 0
            ) + 1,
        })
        .eq("id", pendente.id);

      return NextResponse.json(
        {
          error: "Código incorreto.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: clienteExistente,
    } = await supabase
      .from("clientes_ia_whatsapp")
      .select("id")
      .or(
        `email.eq.${pendente.email},telefone.eq.${pendente.telefone}`
      )
      .maybeSingle();

    if (clienteExistente) {
      return NextResponse.json(
        {
          error:
            "Já existe uma conta com este email ou WhatsApp.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      data: plano,
    } = await supabase
      .from("planos")
      .select("*")
      .eq(
        "id",
        pendente.plano_id
      )
      .maybeSingle();

    const {
      data: servico,
    } = await supabase
      .from("servicos_ia")
      .select("*")
      .eq(
        "id",
        pendente.servico_id
      )
      .maybeSingle();

    const sessionToken =
      gerarTokenSessao();

    const sessionExpiresAt =
      new Date(
        Date.now() +
          1000 *
            60 *
            60 *
            24 *
            30
      ).toISOString();

    const clienteId =
      crypto.randomUUID();

    const agora =
      new Date().toISOString();

    const {
      data: cliente,
      error: clienteError,
    } = await supabase
      .from(
        "clientes_ia_whatsapp"
      )
      .insert({
        id: clienteId,

        nome: pendente.nome,
        email: pendente.email,
        telefone:
          pendente.telefone,

        endereco:
          pendente.endereco ||
          null,

        documento:
          pendente.documento ||
          null,

        senha_hash:
          pendente.senha_hash,

        status:
          "aguardando_pagamento",

        telefone_verificado: true,

        telefone_verificado_em:
          agora,

        termos_aceitos:
          pendente.aceitou_termos ??
          true,

        termos_aceitos_em:
          agora,

        session_token:
          sessionToken,

        session_expires_at:
          sessionExpiresAt,

        servico_id:
          pendente.servico_id ||
          null,

        plano_id:
          pendente.plano_id ||
          null,

        plano_nome:
          plano?.nome || null,

        servico_nome:
          servico?.nome || null,

        cupom_codigo:
          pendente.cupom_codigo ||
          null,

        criado_em: agora,
        updated_at: agora,
      })
      .select("*")
      .single();

    if (
      clienteError ||
      !cliente
    ) {
      return NextResponse.json(
        {
          error:
            "Erro ao criar cliente.",
          detalhe:
            clienteError?.message,
        },
        {
          status: 500,
        }
      );
    }

    await supabase
      .from("cliente_servicos")
      .upsert(
        {
          cliente_id: cliente.id,

          servico_id:
            pendente.servico_id,

          plano_id:
            pendente.plano_id,

          status:
            "aguardando_pagamento",

          data_inicio: null,

          data_expiracao: null,

          evolution_status:
            "aguardando_pagamento",

          created_at: agora,
          updated_at: agora,
        },
        {
          onConflict:
            "cliente_id,servico_id",
        }
      );

    await supabase
      .from(
        "cadastros_pendentes"
      )
      .update({
        telefone_verificado: true,
        verificado_em: agora,
      })
      .eq("id", pendente.id);

    return NextResponse.json({
      ok: true,

      message:
        "WhatsApp verificado com sucesso.",

      cliente,

      token: sessionToken,

      servico_id:
        pendente.servico_id,

      plano_id:
        pendente.plano_id,

      cupom_codigo:
        pendente.cupom_codigo ||
        null,
    });
  } catch (error: any) {
    console.log(
      "ERRO VERIFICAR CADASTRO:",
      error.message
    );

    return NextResponse.json(
      {
        error:
          "Erro ao verificar código.",
        detalhe:
          error.message,
      },
      {
        status: 500,
      }
    );
  }
}