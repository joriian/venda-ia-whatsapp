import { NextResponse } from "next/server";
import axios from "axios";
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

function limparTelefone(telefone: string) {
  return String(telefone || "").replace(/\D/g, "");
}

function normalizarCupom(codigo: string) {
  return String(codigo || "").trim().toUpperCase();
}

function calcularDesconto(tipo: string, valorCupom: number, valorPlano: number) {
  if (tipo === "percentual") {
    return Math.min(valorPlano, (valorPlano * valorCupom) / 100);
  }

  return Math.min(valorPlano, valorCupom);
}

async function validarCupomCheckout({
  codigo,
  planoId,
  servicoId,
  valorOriginal,
}: {
  codigo: string;
  planoId: string;
  servicoId: string;
  valorOriginal: number;
}) {
  const codigoTratado = normalizarCupom(codigo);

  if (!codigoTratado) {
    return {
      cupom: null,
      descontoValor: 0,
      valorFinal: valorOriginal,
    };
  }

  const { data: cupom } = await supabase
    .from("cupons_desconto")
    .select("*")
    .eq("codigo", codigoTratado)
    .maybeSingle();

  if (!cupom || !cupom.ativo) {
    throw new Error("Cupom inválido ou inativo");
  }

  const agora = new Date();

  if (cupom.data_inicio && new Date(cupom.data_inicio) > agora) {
    throw new Error("Cupom ainda não está disponível");
  }

  if (cupom.data_fim && new Date(cupom.data_fim) < agora) {
    throw new Error("Cupom expirado");
  }

  if (
    cupom.limite_usos &&
    Number(cupom.usos_atuais || 0) >= Number(cupom.limite_usos)
  ) {
    throw new Error("Cupom atingiu o limite de usos");
  }

  if (cupom.servico_id && cupom.servico_id !== servicoId) {
    throw new Error("Cupom não é válido para este serviço");
  }

  if (cupom.plano_id && cupom.plano_id !== planoId) {
    throw new Error("Cupom não é válido para este plano");
  }

  const descontoValor = calcularDesconto(
    String(cupom.tipo || "percentual"),
    Number(cupom.valor || 0),
    valorOriginal
  );

  return {
    cupom,
    descontoValor,
    valorFinal: Math.max(0, valorOriginal - descontoValor),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const planoId = String(body.planoId || "").trim();
    const servicoId = String(body.servicoId || "").trim();
    const cupomCodigo = normalizarCupom(body.cupomCodigo || "");

    const nome = String(body.nome || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const telefone = limparTelefone(body.telefone);
    const endereco = String(body.endereco || "").trim();
    const documento = String(body.documento || "").trim();

    const senha = String(body.senha || "").trim();
    const confirmarSenha = String(body.confirmarSenha || "").trim();
    const aceitouTermos = Boolean(body.aceitouTermos);

    if (!planoId || !servicoId) {
      return NextResponse.json(
        { error: "Selecione um serviço e um plano" },
        { status: 400 }
      );
    }

    if (!nome || !email || !telefone) {
      return NextResponse.json(
        { error: "Nome, email e WhatsApp são obrigatórios" },
        { status: 400 }
      );
    }

    if (!senha || !confirmarSenha) {
      return NextResponse.json(
        { error: "Cadastre e confirme sua senha" },
        { status: 400 }
      );
    }

    if (senha !== confirmarSenha) {
      return NextResponse.json(
        { error: "A senha e a confirmação não são iguais" },
        { status: 400 }
      );
    }

    if (!senhaForte(senha)) {
      return NextResponse.json(
        {
          error:
            "A senha deve ter no mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.",
        },
        { status: 400 }
      );
    }

    if (!aceitouTermos) {
      return NextResponse.json(
        { error: "Você precisa aceitar os termos de uso" },
        { status: 400 }
      );
    }

    const { data: plano, error: planoError } = await supabase
      .from("planos")
      .select("*")
      .eq("id", planoId)
      .eq("ativo", true)
      .single();

    if (planoError || !plano) {
      return NextResponse.json(
        { error: "Plano inválido" },
        { status: 400 }
      );
    }

    const { data: servico } = await supabase
      .from("servicos_ia")
      .select("*")
      .eq("id", servicoId)
      .eq("ativo", true)
      .maybeSingle();

    if (!servico) {
      return NextResponse.json(
        { error: "Serviço inválido" },
        { status: 400 }
      );
    }

    const valorOriginal = Number(plano.valor || 0);

    let cupom: any = null;
    let descontoValor = 0;
    let valorFinal = valorOriginal;

    try {
      const cupomValidado = await validarCupomCheckout({
        codigo: cupomCodigo,
        planoId,
        servicoId,
        valorOriginal,
      });

      cupom = cupomValidado.cupom;
      descontoValor = cupomValidado.descontoValor;
      valorFinal = cupomValidado.valorFinal;
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (valorFinal <= 0) {
      valorFinal = 0.01;
    }

    const { data: clienteExistente } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .ilike("email", email)
      .maybeSingle();

    let cliente;

    if (clienteExistente) {
      const { data: atualizado, error: atualizarError } = await supabase
        .from("clientes_ia_whatsapp")
        .update({
          nome,
          telefone,
          endereco,
          documento,
          senha,
          servico_id: servicoId,
          plano_id: plano.id,
          plano_nome: plano.nome,
          servico_nome: servico.nome,
          status: "aguardando_pagamento",
          termos_aceitos: true,
          termos_aceitos_em: new Date().toISOString(),
          cupom_codigo: cupom?.codigo || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clienteExistente.id)
        .select()
        .single();

      if (atualizarError || !atualizado) {
        console.log("ERRO ATUALIZAR CLIENTE:", atualizarError);

        return NextResponse.json(
          { error: "Erro ao atualizar cadastro" },
          { status: 500 }
        );
      }

      cliente = atualizado;
    } else {
      const { data: criado, error: clienteError } = await supabase
        .from("clientes_ia_whatsapp")
        .insert({
          nome,
          email,
          telefone,
          endereco,
          documento,
          senha,
          servico_id: servicoId,
          plano_id: plano.id,
          plano_nome: plano.nome,
          servico_nome: servico.nome,
          status: "aguardando_pagamento",
          termos_aceitos: true,
          termos_aceitos_em: new Date().toISOString(),
          cupom_codigo: cupom?.codigo || null,
          criado_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (clienteError || !criado) {
        console.log("ERRO CRIAR CLIENTE:", clienteError);

        return NextResponse.json(
          { error: "Erro ao criar cadastro" },
          { status: 500 }
        );
      }

      cliente = criado;
    }

    await supabase.from("cliente_servicos").upsert(
      {
        cliente_id: cliente.id,
        servico_id: servicoId,
        plano_id: plano.id,
        status: "aguardando_pagamento",
        evolution_status: "aguardando_pagamento",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "cliente_id,servico_id",
      }
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

    const response = await axios.post(
      "https://api.mercadopago.com/checkout/preferences",
      {
        items: [
          {
            title: `${servico.nome} - ${plano.nome}${
              cupom ? ` - Cupom ${cupom.codigo}` : ""
            }`,
            quantity: 1,
            currency_id: "BRL",
            unit_price: Number(valorFinal.toFixed(2)),
          },
        ],

        payer: {
          email,
          name: nome,
        },

        external_reference: cliente.id,

        metadata: {
          cliente_id: cliente.id,
          servico_id: servico.id,
          plano_id: plano.id,
          meses: plano.meses,
          valor: valorFinal,
          valor_original: valorOriginal,
          desconto_valor: descontoValor,
          cupom_codigo: cupom?.codigo || null,
        },

        back_urls: {
          success: `${siteUrl}/aguardando-pagamento?cliente=${cliente.id}`,
          failure: `${siteUrl}/aguardando-pagamento?cliente=${cliente.id}`,
          pending: `${siteUrl}/aguardando-pagamento?cliente=${cliente.id}`,
        },

        auto_return: "approved",

        notification_url: `${siteUrl}/api/webhook/mercadopago`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    return NextResponse.json({
      ok: true,
      init_point: response.data.init_point,
      clienteId: cliente.id,
      valorOriginal,
      descontoValor,
      valorFinal,
      cupomCodigo: cupom?.codigo || null,
    });
  } catch (error: any) {
    console.log("ERRO CHECKOUT:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error: "Erro ao criar pagamento",
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}