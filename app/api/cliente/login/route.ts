import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = String(body.email || "").trim().toLowerCase();
    const senha = String(body.senha || "").trim();

    if (!email || !senha) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const { data: clientes, error } = await supabase
      .from("clientes_ia_whatsapp")
      .select("*")
      .ilike("email", email);

    if (error) {
      console.log("ERRO BUSCAR CLIENTE:", error);
      return NextResponse.json(
        { error: "Erro ao buscar cliente" },
        { status: 500 }
      );
    }

    const cliente = clientes?.find((c) => {
      return String(c.senha || "").trim() === senha;
    });

    if (!cliente) {
      console.log("LOGIN NEGADO:", { email, senhaInformada: senha });
      return NextResponse.json(
        { error: "Email ou senha incorretos" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      clienteId: cliente.id,
      nome: cliente.nome,
      email: cliente.email,
      status: cliente.status,
    });
  } catch (error: any) {
    console.log("ERRO LOGIN CLIENTE:", error.message);

    return NextResponse.json(
      { error: "Erro ao fazer login" },
      { status: 500 }
    );
  }
}