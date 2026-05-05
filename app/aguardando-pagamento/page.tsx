"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function AguardandoContent() {
  const params = useSearchParams();
  const clienteId = params.get("cliente");
  const [status, setStatus] = useState("aguardando_pagamento");

  useEffect(() => {
    if (!clienteId) return;

    async function verificar() {
      const res = await fetch(`/api/cliente/status?cliente=${clienteId}`);
      const data = await res.json();

      if (data.status) {
        setStatus(data.status);
      }

      if (data.status === "ativo") {
        window.location.href = `/sucesso?cliente=${clienteId}`;
      }
    }

    verificar();
    const interval = setInterval(verificar, 3000);

    return () => clearInterval(interval);
  }, [clienteId]);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4">Aguardando pagamento</h1>

        <p className="text-gray-300 mb-6">
          Assim que o Mercado Pago confirmar, você será redirecionado automaticamente para conectar seu WhatsApp.
        </p>

        <p className="text-yellow-400 mb-4">
          Status: {status}
        </p>

        <div className="animate-pulse text-green-400">
          Verificando pagamento...
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p>Carregando...</p>}>
      <AguardandoContent />
    </Suspense>
  );
}