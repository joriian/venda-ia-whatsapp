"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function ClienteContent() {
  const params = useSearchParams();
  const clienteId = params.get("cliente");

  const [dados, setDados] = useState<any>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingQr, setLoadingQr] = useState(false);

  async function carregarDados() {
    if (!clienteId) return;

    const res = await fetch(`/api/cliente/dados?cliente=${clienteId}`);
    const data = await res.json();

    setDados(data);
    setLoading(false);
  }

  async function gerarQrCode() {
    if (!clienteId) return;

    setLoadingQr(true);

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
    } else {
      alert(data.error || "QR Code ainda não disponível");
    }

    setLoadingQr(false);
  }

  useEffect(() => {
    carregarDados();
  }, [clienteId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Carregando área do cliente...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto bg-zinc-900 border border-zinc-700 rounded-2xl p-8">
        <h1 className="text-3xl font-bold mb-6">Área do Cliente</h1>

        <div className="space-y-3 text-gray-300 mb-8">
          <p>
            <strong>Nome:</strong> {dados?.cliente?.nome}
          </p>

          <p>
            <strong>Email:</strong> {dados?.cliente?.email}
          </p>

          <p>
            <strong>Plano:</strong> {dados?.cliente?.plano_id}
          </p>

          <p>
            <strong>Status:</strong> {dados?.cliente?.status}
          </p>

          <p>
            <strong>Expira em:</strong>{" "}
            {dados?.cliente?.data_expiracao
              ? new Date(dados.cliente.data_expiracao).toLocaleDateString("pt-BR")
              : "-"}
          </p>

          <p>
            <strong>Instância:</strong>{" "}
            {dados?.instancia?.instance_name || "Ainda não criada"}
          </p>
        </div>

        <button
          onClick={gerarQrCode}
          disabled={loadingQr || !dados?.instancia}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-bold"
        >
          {loadingQr ? "Gerando QR..." : "Gerar QR Code"}
        </button>

        {qr && (
          <div className="mt-8">
            <p className="mb-4 text-gray-300">
              Escaneie este QR Code no WhatsApp:
            </p>

            <img
              src={qr}
              alt="QR Code WhatsApp"
              className="bg-white p-4 rounded-xl"
            />
          </div>
        )}
      </div>
    </main>
  );
}

export default function ClientePage() {
  return (
    <Suspense fallback={<p>Carregando...</p>}>
      <ClienteContent />
    </Suspense>
  );
}