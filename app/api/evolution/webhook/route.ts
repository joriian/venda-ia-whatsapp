import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function pegarEvento(body: any) {
  return (
    body?.event ||
    body?.type ||
    body?.data?.event ||
    body?.body?.event ||
    ""
  );
}

function pegarInstanceName(body: any) {
  return (
    body?.instance ||
    body?.instanceName ||
    body?.data?.instance ||
    body?.data?.instanceName ||
    body?.body?.instance ||
    ""
  );
}

function pegarQrCode(body: any) {
  return (
    body?.data?.qrcode ||
    body?.data?.qr ||
    body?.qrcode ||
    body?.qr ||
    body?.base64 ||
    body?.data?.base64 ||
    ""
  );
}

function pegarStatus(body: any) {
  return (
    body?.data?.state ||
    body?.data?.status ||
    body?.state ||
    body?.status ||
    body?.connectionStatus ||
    "connecting"
  );
}

function pegarNumero(body: any) {
  return (
    body?.data?.ownerJid ||
    body?.data?.profile?.id ||
    body?.data?.jid ||
    body?.sender ||
    ""
  );
}

function pegarNome(body: any) {
  return (
    body?.data?.profileName ||
    body?.data?.pushName ||
    body?.data?.name ||
    ""
  );
}

async function buscarVinculo(instanceName: string) {
  const { data } = await supabase
    .from("instancias_evolution")
    .select("*")
    .eq("instance_name", instanceName)
    .maybeSingle();

  return data;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const evento = pegarEvento(body);
    const instanceName = pegarInstanceName(body);

    if (!instanceName) {
      return NextResponse.json({
        ok: true,
        ignored: "Evento sem instanceName",
      });
    }

    const vinculo = await buscarVinculo(instanceName);

    const clienteId = vinculo?.cliente_id || null;
    const servicoId = vinculo?.servico_id || null;
    const clienteServicoId = vinculo?.cliente_servico_id || null;

    const qrcode = pegarQrCode(body);
    const status = pegarStatus(body);
    const numero = pegarNumero(body);
    const nome = pegarNome(body);

    await supabase.from("evolution_qrcodes").upsert(
      {
        cliente_id: clienteId,
        servico_id: servicoId,
        cliente_servico_id: clienteServicoId,
        instance_name: instanceName,
        qrcode: qrcode || null,
        status,
        numero: numero || null,
        nome: nome || null,
        atualizado_em: new Date().toISOString(),
      },
      {
        onConflict: "instance_name",
      }
    );

    await supabase
      .from("instancias_evolution")
      .update({
        status,
        numero: numero || null,
        nome: nome || null,
        updated_at: new Date().toISOString(),
      })
      .eq("instance_name", instanceName);

    if (clienteServicoId) {
      await supabase
        .from("cliente_servicos")
        .update({
          evolution_status: status,
          evolution_qrcode: qrcode || null,
          evolution_numero: numero || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clienteServicoId);
    } else if (clienteId && servicoId) {
      await supabase
        .from("cliente_servicos")
        .update({
          evolution_status: status,
          evolution_qrcode: qrcode || null,
          evolution_numero: numero || null,
          updated_at: new Date().toISOString(),
        })
        .eq("cliente_id", clienteId)
        .eq("servico_id", servicoId);
    }

    return NextResponse.json({
      ok: true,
      evento,
      instanceName,
      status,
    });
  } catch (error: any) {
    console.log("ERRO WEBHOOK EVOLUTION:", error.message);

    return NextResponse.json(
      {
        error: "Erro no webhook Evolution",
        detalhe: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "evolution webhook ativo",
  });
}