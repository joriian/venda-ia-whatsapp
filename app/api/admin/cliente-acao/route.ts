import { NextResponse } from "next/server";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const senha = req.headers.get("x-admin-password");

    if (senha !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { cliente_id, acao } = await req.json();

    if (!cliente_id || !acao) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
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

    // 🔴 BLOQUEAR
    if (acao === "bloquear") {
      await supabase
        .from("clientes_ia_whatsapp")
        .update({ status: "vencido" })
        .eq("id", cliente_id);

      try {
        await axios.post(
          `${process.env.EVOLUTION_API_URL}/instance/logout`,
          { instanceName },
          {
            headers: {
              apikey: process.env.EVOLUTION_API_KEY!,
            },
          }
        );
      } catch {}

      return NextResponse.json({ ok: true, acao: "bloqueado" });
    }

    // 🟢 REATIVAR
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

      return NextResponse.json({ ok: true, acao: "reativado" });
    }

    // 💳 GERAR LINK
    if (acao === "gerar_link") {
      const { data } = await axios.post(
        `${process.env.APP_URL}/api/pagamento/criar`,
        {
          cliente_id,
        }
      );

      return NextResponse.json({
        ok: true,
        link: data.link,
      });
    }

    // 📲 ENVIAR COBRANÇA
    if (acao === "cobrar") {
      const { data } = await axios.post(
        `${process.env.APP_URL}/api/pagamento/criar`,
        {
          cliente_id,
        }
      );

      await axios.post(
        `${process.env.EVOLUTION_API_URL}/message/sendText/${instanceName}`,
        {
          number: cliente.telefone,
          text: `⚠️ Seu plano venceu.

Para continuar usando, realize o pagamento:

${data.link}`,
        },
        {
          headers: {
            apikey: process.env.EVOLUTION_API_KEY!,
          },
        }
      );

      return NextResponse.json({ ok: true, acao: "cobrado" });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error: any) {
    console.log("ERRO ACAO:", error.message);

    return NextResponse.json({ error: true }, { status: 500 });
  }
}