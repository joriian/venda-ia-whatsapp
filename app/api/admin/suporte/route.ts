import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data } = await supabase
    .from("tickets_suporte")
    .select(`
      *,
      clientes_ia_whatsapp(nome,email),
      tickets_mensagens(*)
    `)
    .order("criado_em", { ascending: false });

  return NextResponse.json({
    tickets: data || [],
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  const { ticket_id, mensagem } = body;

  const { data: ticket } = await supabase
    .from("tickets_suporte")
    .select("*")
    .eq("id", ticket_id)
    .single();

  if (!ticket) {
    return NextResponse.json(
      { error: "Ticket não encontrado" },
      { status: 404 }
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

  return NextResponse.json({
    ok: true,
  });
}

export async function PUT(req: Request) {
  const body = await req.json();

  await supabase
    .from("tickets_suporte")
    .update({
      status: "fechado",
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", body.ticket_id);

  return NextResponse.json({
    ok: true,
  });
}