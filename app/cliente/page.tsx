"use client";

import { useEffect, useState } from "react";

export default function ClientePage() {
  const [clienteId, setClienteId] = useState("");
  const [qr, setQr] = useState("");
  const [status, setStatus] = useState("Carregando...");
  const [conectado, setConectado] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("cliente");

    if (id) {
      setClienteId(id);
      verificar(id);
    }
  }, []);

  async function verificar(id: string) {
    try {
      const res = await fetch("/api/instance/qrcode", {
        method: "POST",
        body: JSON.stringify({ clienteId: id }),
      });

      const data = await res.json();

      if (data.conectado) {
        setConectado(true);
        setStatus("WhatsApp conectado");
        return;
      }

      if (data.qrcode) {
        setQr(data.qrcode);
        setStatus("Escaneie o QR Code");
        return;
      }

      setStatus("Aguardando conexão...");
      setTimeout(() => verificar(id), 3000);

    } catch (err) {
      setStatus("Erro ao verificar");
    }
  }

  async function conectar() {
    setLoading(true);

    await fetch("/api/instance/control", {
      method: "POST",
      body: JSON.stringify({
        clienteId,
        action: "connect",
      }),
    });

    setTimeout(() => verificar(clienteId), 2000);
    setLoading(false);
  }

  async function desconectar() {
    setLoading(true);

    await fetch("/api/instance/control", {
      method: "POST",
      body: JSON.stringify({
        clienteId,
        action: "disconnect",
      }),
    });

    setConectado(false);
    setQr("");
    setStatus("Desconectado");

    setLoading(false);
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <div className="p-6 bg-zinc-900 rounded-xl text-center w-[350px]">

        <h1 className="text-xl mb-4">Área do Cliente</h1>

        {conectado ? (
          <>
            <div className="text-green-500 text-lg font-bold mb-4">
              ✅ Conectado
            </div>

            <button
              onClick={desconectar}
              disabled={loading}
              className="w-full bg-red-600 py-2 rounded"
            >
              Desconectar WhatsApp
            </button>
          </>
        ) : (
          <>
            {qr ? (
              <>
                <p className="mb-2">{status}</p>
                <img src={qr} alt="QR Code" className="mx-auto mb-4" />
              </>
            ) : (
              <p className="mb-4">{status}</p>
            )}

            <button
              onClick={conectar}
              disabled={loading}
              className="w-full bg-green-600 py-2 rounded"
            >
              {loading ? "Gerando..." : "Conectar WhatsApp"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}