import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { clienteId, senhaAtual, novaSenha } = await req.json();

    if (!clienteId || !senhaAtual || !novaSenha) {
      return NextResponse.json(
        { error: "Preencha todos os campos" },
        { status: 400 }
      );
    }

    if (String(novaSenha).length < 6) {
      return NextResponse.json(
        { error: "A nova senha deve ter pelo menos 6 caracteres" },
        { status: 400 }
      );
    }

    const { data: cliente } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .eq("id", clienteId)
      .single();

    if (!cliente) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    if (String(cliente.senha || "").trim() !== String(senhaAtual || "").trim()) {
      return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 });
    }

    await supabase
      .from("clientes_ia_whatsapp")
      .update({ senha: String(novaSenha).trim() })
      .eq("id", clienteId);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.log("ERRO ALTERAR SENHA:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}