"use client";

import { useEffect, useState } from "react";

export default function ClientePage() {
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [instanceName, setInstanceName] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clienteId = params.get("cliente");

    if (clienteId) {
      const instance = `cliente_${clienteId.replace(/-/g, "")}`;
      setInstanceName(instance);
      console.log("INSTANCIA GERADA:", instance);
    }
  }, []);

  async function gerarQR() {
    try {
      if (!instanceName) {
        alert("Erro: instância inválida");
        return;
      }

      setLoading(true);

      const res = await fetch("/api/instance/qrcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ instanceName }),
      });

      const data = await res.json();

      if (data?.base64) {
        setQr(data.base64);
      } else {
        alert("QR ainda não disponível, tente novamente");
      }
    } catch (err) {
      alert("Erro ao gerar QR");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 p-8 rounded-xl text-center">
        <h1 className="text-xl mb-4">Área do Cliente</h1>

        {qr ? (
          <img
            src={`data:image/png;base64,${qr}`}
            className="mx-auto"
          />
        ) : (
          <button
            onClick={gerarQR}
            className="bg-green-600 px-6 py-3 rounded"
            disabled={loading}
          >
            {loading ? "Gerando..." : "Conectar WhatsApp"}
          </button>
        )}
      </div>
    </main>
  );
}