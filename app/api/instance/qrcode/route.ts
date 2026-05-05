import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const instanceName = body.instanceName;

    if (!instanceName) {
      return NextResponse.json(
        { error: "InstanceName não enviado" },
        { status: 400 }
      );
    }

    console.log("BUSCANDO QR DA INSTANCIA:", instanceName);

    const res = await axios.get(
      `${process.env.EVOLUTION_API_URL}/instance/connect/${instanceName}`,
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
        },
      }
    );

    return NextResponse.json(res.data);
  } catch (error: any) {
    console.log("ERRO QR:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error: true,
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}