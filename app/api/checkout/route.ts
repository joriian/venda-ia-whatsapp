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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const planoId = body.planoId;
    const servicoId = body.servicoId;
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
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
    }

    const { data: servico } = await supabase
      .from("servicos_ia")
      .select("*")
      .eq("id", servicoId)
      .eq("ativo", true)
      .maybeSingle();

    if (!servico) {
      return NextResponse.json({ error: "Serviço inválido" }, { status: 400 });
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
          status: "aguardando_pagamento",
          termos_aceitos: true,
          termos_aceitos_em: new Date().toISOString(),
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
          status: "aguardando_pagamento",
          termos_aceitos: true,
          termos_aceitos_em: new Date().toISOString(),
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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

    const response = await axios.post(
      "https://api.mercadopago.com/checkout/preferences",
      {
        items: [
          {
            title: `${servico.nome} - ${plano.nome}`,
            quantity: 1,
            currency_id: "BRL",
            unit_price: Number(plano.valor),
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
          valor: plano.valor,
        },
        back_urls: {
          success: `${siteUrl}/aguardando-pagamento?cliente=${cliente.id}`,
          failure: `${siteUrl}/erro`,
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