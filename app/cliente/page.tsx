"use client";

import { useEffect, useState } from "react";

export default function ClientePage() {
  const [qr, setQr] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState("");
  const [status, setStatus] = useState("Preparando área do cliente...");
  const [loadingQr, setLoadingQr] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clienteId = params.get("cliente");

    if (!clienteId) {
      setStatus("Cliente não informado.");
      return;
    }

    const instance = `cliente_${clienteId.replace(/-/g, "")}`;
    setInstanceName(instance);
    setStatus("Clique em gerar QR Code para conectar seu WhatsApp.");
  }, []);

  function ajustarQrCode(data: any) {
    const base64 =
      data?.base64 ||
      data?.qrcode?.base64 ||
      data?.qrcode ||
      data?.qr ||
      data?.code;

    if (!base64 || base64 === true) {
      return null;
    }

    const texto = String(base64);

    if (texto.startsWith("data:image")) {
      return texto;
    }

    return `data:image/png;base64,${texto}`;
  }

  async function gerarQR() {
    if (!instanceName) {
      alert("Instância inválida.");
      return;
    }

    try {
      setLoadingQr(true);
      setStatus("Gerando QR Code...");

      const res = await fetch("/api/instance/qrcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ instanceName }),
      });

      const data = await res.json();
      const qrFinal = ajustarQrCode(data);

      if (qrFinal) {
        setQr(qrFinal);
        setStatus("Escaneie o QR Code no WhatsApp.");
        return;
      }

      setStatus("QR ainda não disponível. Aguarde alguns segundos e tente novamente.");
    } catch (error) {
      console.error(error);
      setStatus("Erro ao gerar QR Code.");
    } finally {
      setLoadingQr(false);
    }
  }

  async function resetar() {
    if (!instanceName) {
      alert("Instância inválida.");
      return;
    }

    try {
      setLoadingReset(true);
      setQr(null);
      setStatus("Resetando conexão...");

      const res = await fetch("/api/instance/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ instanceName }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setStatus("Erro ao resetar conexão.");
        return;
      }

      setStatus("Conexão resetada. Agora clique em gerar QR Code novamente.");
    } catch (error) {
      console.error(error);
      setStatus("Erro ao resetar conexão.");
    } finally {
      setLoadingReset(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-6">
      <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-2xl text-center w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Área do Cliente</h1>

        <p className="text-gray-300 text-sm mb-6">{status}</p>

        {qr && (
          <div className="mb-6">
            <img
              src={qr}
              alt="QR Code WhatsApp"
              className="mx-auto bg-white p-3 rounded-xl w-64 h-64 object-contain"
            />
          </div>
        )}

        <div className="grid gap-3">
          <button
            onClick={gerarQR}
            disabled={loadingQr || loadingReset}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold"
          >
            {loadingQr ? "Gerando..." : "Gerar QR Code"}
          </button>

          <button
            onClick={resetar}
            disabled={loadingQr || loadingReset}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold"
          >
            {loadingReset ? "Resetando..." : "Resetar conexão"}
          </button>
        </div>
      </div>
    </main>
  );
}