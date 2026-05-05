import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (token) {
      await supabase
        .from("clientes_ia_whatsapp")
        .update({
          session_token: null,
          session_expires_at: null,
        })
        .eq("session_token", token);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.log("ERRO LOGOUT CLIENTE:", error.message);
    return NextResponse.json({ ok: true });
  }
}