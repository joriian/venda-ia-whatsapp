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

    const { data } = await axios.get(
      `${process.env.EVOLUTION_API_URL}/instance/fetchInstances`,
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
        },
      }
    );

    const lista = Array.isArray(data) ? data : data?.instances || [];

    const instancia = lista.find((item: any) => {
      return item?.name === instanceName || item?.instanceName === instanceName;
    });

    if (!instancia) {
      return NextResponse.json({
        encontrado: false,
        conectado: false,
        status: "nao_encontrada",
      });
    }

    return NextResponse.json({
      encontrado: true,
      conectado: instancia.connectionStatus === "open",
      status: instancia.connectionStatus,
      numero: instancia.ownerJid || instancia.number || null,
      nomePerfil: instancia.profileName || null,
      fotoPerfil: instancia.profilePicUrl || null,
    });
  } catch (error: any) {
    console.log("ERRO STATUS:", error.response?.data || error.message);

    return NextResponse.json(
      {
        error: true,
        detalhe: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}