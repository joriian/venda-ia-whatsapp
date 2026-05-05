"use client";

import { useEffect, useState } from "react";

export default function ClientePage() {
  const [qr, setQr] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState("");
  const [status, setStatus] = useState("Aguardando...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clienteId = params.get("cliente");

    if (clienteId) {
      const instance = `cliente_${clienteId.replace(/-/g, "")}`;
      setInstanceName(instance);

      iniciarBuscaQR(instance);
    }
  }, []);

  async function iniciarBuscaQR(instance: string) {
    setStatus("Gerando QR Code...");

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/instance/qrcode", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ instanceName: instance }),
        });

        const data = await res.json();

        if (data?.base64) {
          setQr(data.base64);
          setStatus("Escaneie o QR Code");
          clearInterval(interval);
        } else {
          console.log("QR ainda não pronto...");
        }
      } catch (err) {
        console.log("Erro tentando buscar QR...");
      }
    }, 3000);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 p-8 rounded-xl text-center w-[300px]">
        <h1 className="text-xl mb-4">Área do Cliente</h1>

        <p className="mb-4 text-sm text-gray-400">{status}</p>

        {qr ? (
          <img
            src={`data:image/png;base64,${qr}`}
            className="mx-auto"
          />
        ) : (
          <div className="text-gray-500">Aguarde...</div>
        )}
      </div>
    </main>
  );
}