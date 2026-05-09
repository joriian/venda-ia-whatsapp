"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function SucessoContent() {
  const params = useSearchParams();

  const clienteId =
    params.get("cliente");

  const token =
    params.get("token");

  const [qr, setQr] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem(
        "clienteToken",
        token
      );
    }

    if (clienteId) {
      localStorage.setItem(
        "clienteId",
        clienteId
      );
    }
  }, [token, clienteId]);

  async function carregarQR() {
    if (!clienteId) return;

    try {
      const res = await fetch(
        "/api/instance/qrcode",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            clienteId,
          }),
        }
      );

      const data = await res.json();

      if (data.qrcode) {
        setQr(data.qrcode);
      }
    } catch (err) {
      console.log("Erro QR:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarQR();

    const interval = setInterval(
      carregarQR,
      3000
    );

    return () =>
      clearInterval(interval);
  }, [clienteId]);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-10 max-w-xl w-full">
        <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center text-4xl font-black mx-auto mb-6">
          ✓
        </div>

        <h1 className="text-4xl font-black mb-4">
          Pagamento aprovado
        </h1>

        <p className="text-gray-300 mb-8">
          Agora conecte seu WhatsApp
          para ativar a automação.
        </p>

        {loading && (
          <div>
            <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Carregando QR Code...</p>
          </div>
        )}

        {qr && (
          <div>
            <img
              src={qr}
              alt="QR Code"
              className="bg-white p-4 rounded-3xl mx-auto"
            />

            <p className="text-gray-400 text-sm mt-5">
              Escaneie usando o WhatsApp.
            </p>

            <button
              onClick={() =>
                (window.location.href =
                  "/cliente")
              }
              className="mt-6 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-2xl font-bold"
            >
              Abrir painel
            </button>
          </div>
        )}

        {!loading && !qr && (
          <div>
            <p className="text-yellow-400 font-bold">
              Aguardando QR Code...
            </p>

            <p className="text-gray-500 text-sm mt-2">
              A Evolution está iniciando.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}