import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) {
      return NextResponse.json(
        { error: "InstanceName obrigatório" },
        { status: 400 }
      );
    }

    console.log("RESETANDO INSTANCIA:", instanceName);

    await axios.delete(
      `${process.env.EVOLUTION_API_URL}/instance/logout/${instanceName}`,
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
        },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.log("ERRO RESET:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error: true,
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}