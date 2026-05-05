import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: Request) {
  try {
    const res = await axios.get(
      `${process.env.EVOLUTION_API_URL}/instance/fetchInstances`,
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
        },
      }
    );

    const lista = Array.isArray(res.data)
      ? res.data
      : res.data?.instances || [];

    const formatado = lista.map((i: any) => ({
      instance: i.name || i.instanceName,
      status: i.connectionStatus,
      conectado: i.connectionStatus === "open",
      numero: i.ownerJid || null,
      nome: i.profileName || null,
    }));

    return NextResponse.json(formatado);
  } catch (error: any) {
    console.log("ERRO ADMIN INSTANCES:", error.response?.data || error.message);

    return NextResponse.json(
      { error: true },
      { status: 500 }
    );
  }
}