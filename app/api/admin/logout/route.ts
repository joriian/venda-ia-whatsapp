import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function pegarCookie(req: Request, nome: string) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`${nome}=([^;]+)`));
  return match?.[1] || "";
}

export async function POST(req: Request) {
  try {
    let token = "";

    try {
      const body = await req.json();
      token = body?.token || "";
    } catch {
      token = "";
    }

    if (!token) {
      token = pegarCookie(req, "adminToken");
    }

    if (token) {
      await supabase
        .from("admin_users")
        .update({
          session_token: null,
          session_expires_at: null,
        })
        .eq("session_token", token);
    }

    const response = NextResponse.json({ ok: true });

    response.cookies.set("adminToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch {
    const response = NextResponse.json({ ok: true });

    response.cookies.set("adminToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  }
}