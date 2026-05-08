import { NextResponse } from "next/server";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "";

const CRON_SECRET = process.env.CRON_SECRET || "";

async function chamarRota(path: string) {
  const url = `${APP_URL}${path}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    return {
      path,
      ok: res.ok,
      status: res.status,
      data,
    };
  } catch (error: any) {
    return {
      path,
      ok: false,
      error: error.message,
    };
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret") || "";

  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json(
      { error: "Não autorizado" },
      { status: 401 }
    );
  }

  if (!APP_URL) {
    return NextResponse.json(
      {
        error:
          "NEXT_PUBLIC_APP_URL ou NEXT_PUBLIC_SITE_URL não configurada.",
      },
      { status: 500 }
    );
  }

  const resultados = [];

  resultados.push(
    await chamarRota(`/api/cron/notificacoes-vencimentos`)
  );

  resultados.push(
    await chamarRota(`/api/cron/verificar-vencimentos?secret=${CRON_SECRET}`)
  );
  
  resultados.push(
	await chamarRota(`/api/cron/verificar-instancias`)
  );

  return NextResponse.json({
    ok: true,
    executado_em: new Date().toISOString(),
    resultados,
  });
}