"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function SucessoContent() {
  const params = useSearchParams();
  const clienteId = params.get("cliente");

  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function carregarQR() {
    if (!clienteId) return;

    try {
      const res = await fetch("/api/instance/qrcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clienteId }),
      });

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
    const interval = setInterval(() => {
      carregarQR();
    }, 3000);

    return () => clearInterval(interval);
  }, [clienteId]);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-3xl font-bold mb-6">
        Pagamento aprovado 🎉
      </h1>

      <p className="text-gray-400 mb-8">
        Escaneie o QR Code para conectar seu WhatsApp
      </p>

      {loading && <p>Carregando QR Code...</p>}

      {qr && (
        <img
          src={qr}
          alt="QR Code"
          className="bg-white p-4 rounded-xl"
        />
      )}

      {!loading && !qr && (
        <p className="text-yellow-400">
          Aguardando QR Code...
        </p>
      )}
    </main>
  );
}