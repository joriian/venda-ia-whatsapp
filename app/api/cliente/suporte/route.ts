import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET =
  process.env.JWT_SECRET || "NEXORA_SECRET_2026";

async function validarCliente(token: string) {
  if (!token) return null;

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (decoded?.id) {
      const { data } = await supabase
        .from("clientes_ia_whatsapp")
        .select("*")
        .eq("id", decoded.id)
        .maybeSingle();

      if (data) return data;
    }
  } catch {}

  const { data } = await supabase
    .from("clientes_ia_whatsapp")
    .select("*")
    .eq("session_token", token)
    .maybeSingle();

  return data || null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = body.token;

    const cliente = await validarCliente(token);

    if (!cliente) {
      return NextResponse.json(
        { error: "Sessão inválida" },
        { status: 401 }
      );
    }

    const acao = body.acao;

    if (acao === "listar") {
      const { data, error } = await supabase
        .from("tickets_suporte")
        .select(`
          *,
          tickets_mensagens (*)
        `)
        .eq("cliente_id", cliente.id)
        .order("criado_em", { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        tickets: data || [],
      });
    }

    if (acao === "criar") {
      if (!body.assunto || !body.mensagem) {
        return NextResponse.json(
          { error: "Assunto e mensagem são obrigatórios" },
          { status: 400 }
        );
      }

      const { data: ticket, error } = await supabase
        .from("tickets_suporte")
        .insert({
          cliente_id: cliente.id,
          cliente_servico_id: body.cliente_servico_id || null,
          assunto: body.assunto,
          categoria: body.categoria || "suporte",
          prioridade: body.prioridade || "normal",
          status: "aberto",
          origem: "painel_cliente",
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error || !ticket) {
        return NextResponse.json(
          { error: error?.message || "Erro ao criar ticket" },
          { status: 500 }
        );
      }

      await supabase.from("tickets_mensagens").insert({
        ticket_id: ticket.id,
        autor_tipo: "cliente",
        autor_nome: cliente.nome || "Cliente",
        mensagem: body.mensagem,
        criado_em: new Date().toISOString(),
      });

      return NextResponse.json({
        ok: true,
        ticket,
      });
    }

    if (acao === "responder") {
      if (!body.ticket_id || !body.mensagem) {
        return NextResponse.json(
          { error: "Ticket e mensagem são obrigatórios" },
          { status: 400 }
        );
      }

      const { data: ticket } = await supabase
        .from("tickets_suporte")
        .select("*")
        .eq("id", body.ticket_id)
        .eq("cliente_id", cliente.id)
        .maybeSingle();

      if (!ticket) {
        return NextResponse.json(
          { error: "Ticket não encontrado" },
          { status: 404 }
        );
      }

      await supabase.from("tickets_mensagens").insert({
        ticket_id: ticket.id,
        autor_tipo: "cliente",
        autor_nome: cliente.nome || "Cliente",
        mensagem: body.mensagem,
        criado_em: new Date().toISOString(),
      });

      await supabase
        .from("tickets_suporte")
        .update({
          status: "aberto",
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", ticket.id);

      return NextResponse.json({
        ok: true,
      });
    }

    return NextResponse.json(
      { error: "Ação inválida" },
      { status: 400 }
    );
  } catch (error: any) {
    console.log("ERRO SUPORTE CLIENTE:", error.message);

    return NextResponse.json(
      {
        error: "Erro interno do suporte",
        detalhe: error.message,
      },
      { status: 500 }
    );
  }
}