import { NextResponse } from "next/server";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validarAdmin(req: Request) {
  const token = req.headers.get("x-admin-token");

  if (!token) return null;

  const { data: admin } = await supabase
    .from("admin_users")
    .select("*")
    .eq("session_token", token)
    .eq("ativo", true)
    .maybeSingle();

  if (!admin) return null;

  const expira = admin.session_expires_at
    ? new Date(admin.session_expires_at)
    : null;

  if (!expira || expira < new Date()) return null;

  return admin;
}

function podeBloquearReativar(nivel: string) {
  return nivel === "dono" || nivel === "admin";
}

function podeFinanceiro(nivel: string) {
  return nivel === "dono" || nivel === "admin" || nivel === "financeiro";
}

export async function POST(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { cliente_id, acao } = await req.json();

    if (!cliente_id || !acao) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    if ((acao === "bloquear" || acao === "reativar") && !podeBloquearReativar(admin.nivel)) {
      return NextResponse.json(
        { error: "Sem permissão para bloquear ou reativar clientes" },
        { status: 403 }
      );
    }

    if ((acao === "gerar_link" || acao === "cobrar") && !podeFinanceiro(admin.nivel)) {
      return NextResponse.json(
        { error: "Sem permissão para ações financeiras" },
        { status: 403 }
      );
    }

    const { data: cliente } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .eq("id", cliente_id)
      .single();

    if (!cliente) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const instanceName = `cliente_${cliente_id}`.replace(/-/g, "");
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

    if (acao === "bloquear") {
      await supabase
        .from("clientes_ia_whatsapp")
        .update({ status: "vencido" })
        .eq("id", cliente_id);

      await supabase
        .from("instancias_evolution")
        .update({ status: "bloqueado_manual" })
        .eq("cliente_id", cliente_id);

      try {
        await axios.delete(
          `${process.env.EVOLUTION_API_URL}/instance/logout/${instanceName}`,
          {
            headers: {
              apikey: process.env.EVOLUTION_API_KEY!,
            },
          }
        );
      } catch (error: any) {
        console.log("BLOQUEIO LOGOUT:", error.response?.data || error.message);
      }

      return NextResponse.json({ ok: true, acao: "bloqueado" });
    }

    if (acao === "reativar") {
      const novaData = new Date();
      novaData.setMonth(novaData.getMonth() + 1);

      await supabase
        .from("clientes_ia_whatsapp")
        .update({
          status: "ativo",
          data_expiracao: novaData.toISOString(),
        })
        .eq("id", cliente_id);

      await supabase
        .from("instancias_evolution")
        .update({ status: "reativado_manual" })
        .eq("cliente_id", cliente_id);

      return NextResponse.json({ ok: true, acao: "reativado" });
    }

    if (acao === "gerar_link") {
      const response = await fetch(`${siteUrl}/api/pagamento/criar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId: cliente_id,
        }),
      });

      const data = await response.json();

      if (!data.url) {
        return NextResponse.json(
          { error: "Erro ao gerar link de pagamento" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        link: data.url,
      });
    }

    if (acao === "cobrar") {
      const response = await fetch(`${siteUrl}/api/pagamento/criar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId: cliente_id,
        }),
      });

      const data = await response.json();
      const link = data.url;

      if (!link) {
        return NextResponse.json(
          { error: "Erro ao gerar link de pagamento" },
          { status: 500 }
        );
      }

      await axios.post(
        `${process.env.EVOLUTION_API_URL}/message/sendText/${instanceName}`,
        {
          number: String(cliente.telefone || "").replace(/\D/g, ""),
          text: `Olá, ${cliente.nome || "cliente"}!

Seu plano está pendente ou vencido.

Para renovar, pague pelo link abaixo:
${link}`,
        },
        {
          headers: {
            apikey: process.env.EVOLUTION_API_KEY!,
            "Content-Type": "application/json",
          },
        }
      );

      return NextResponse.json({ ok: true, acao: "cobrado" });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error: any) {
    console.log("ERRO ACAO:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error: true,
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}