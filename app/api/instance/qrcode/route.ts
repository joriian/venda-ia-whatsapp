import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const instance = searchParams.get("instance");

    if (!instance) {
      return NextResponse.json({ error: "Instance não informada" }, { status: 400 });
    }

    const { data } = await axios.get(
      `${process.env.EVOLUTION_API_URL}/instance/connect/${instance}`,
      {
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
          Authorization: `Bearer ${process.env.EVOLUTION_API_KEY!}`,
        },
      }
    );

    return NextResponse.json(data);
  } catch (error: any) {
    console.log("ERRO QR:", error.response?.data || error.message);

    return NextResponse.json(
      { error: true },
      { status: 500 }
    );
  }
}