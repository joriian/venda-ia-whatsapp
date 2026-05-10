import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("tickets_suporte")
    .select(`
      *,
      clientes_ia_whatsapp(nome,email),
      tickets_mensagens(*)
    `)
    .order("criado_em", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    tickets: data || [],
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  const { ticket_id, mensagem } = body;

  if (!ticket_id || !mensagem) {
    return NextResponse.json(
      { error: "Ticket e mensagem são obrigatórios" },
      { status: 400 }
    );
  }

  await supabase.from("tickets_mensagens").insert({
    ticket_id,
    autor_tipo: "admin",
    autor_nome: "Suporte Nexora",
    mensagem,
    criado_em: new Date().toISOString(),
  });

  await supabase
    .from("tickets_suporte")
    .update({
      status: "respondido",
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", ticket_id);

  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  const body = await req.json();

  const ticketId = body.ticket_id;

  if (!ticketId) {
    return NextResponse.json(
      { error: "Ticket obrigatório" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("tickets_suporte")
    .update({
      status: "fechado",
      fechado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}