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

    // 🔥 1. RESETA A INSTANCIA (MUITO IMPORTANTE)
    await axios.delete(
      `${process.env.EVOLUTION_API_URL}/instance/logout/${instanceName}`,
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
        },
      }
    );

    // 🔥 2. AGUARDA UM POUCO
    await new Promise((r) => setTimeout(r, 2000));

    console.log("GERANDO QR:", instanceName);

    // 🔥 3. PEGA QR NOVO
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