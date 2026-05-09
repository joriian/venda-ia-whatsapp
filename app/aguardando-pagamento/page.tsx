"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function AguardandoPagamentoContent() {
  const params = useSearchParams();

  const clienteId = params.get("cliente");
  const token = params.get("token");

  const paymentId =
    params.get("payment_id") ||
    params.get("collection_id");

  const [status, setStatus] = useState("aguardando_pagamento");
  const [sincronizando, setSincronizando] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem("clienteToken", token);
    }

    if (clienteId) {
      localStorage.setItem("clienteId", clienteId);
    }
  }, [token, clienteId]);

  async function sincronizarPagamento() {
    if (!paymentId) {
      setSincronizando(false);
      return;
    }

    try {
      await fetch(`/api/mercadopago/sincronizar?payment_id=${paymentId}`, {
        cache: "no-store",
      });
    } catch (error) {
      console.log("Erro ao sincronizar pagamento:", error);
    } finally {
      setSincronizando(false);
    }
  }

  async function verificarStatus() {
    if (!clienteId) return;

    try {
      const res = await fetch(`/api/cliente/status?cliente=${clienteId}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (data.status) {
        setStatus(data.status);
      }

      if (data.status === "ativo") {
        window.location.href = `/sucesso?cliente=${clienteId}${
          token ? `&token=${token}` : ""
        }`;
      }
    } catch (error) {
      console.log("Erro ao verificar status:", error);
    }
  }

  useEffect(() => {
    sincronizarPagamento();
  }, [paymentId]);

  useEffect(() => {
    verificarStatus();

    const interval = setInterval(() => {
      verificarStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [clienteId, token]);

  function statusPt(status: string) {
    const mapa: any = {
      ativo: "Ativo",
      aguardando_pagamento: "Aguardando pagamento",
      pendente: "Pendente",
      aprovado: "Aprovado",
      recusado: "Recusado",
      cancelado: "Cancelado",
      vencido: "Vencido",
    };

    return mapa[String(status || "").toLowerCase()] || status || "-";
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-10 text-center max-w-lg w-full">
        <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />

        <h1 className="text-4xl font-black mb-4">
          Aguardando pagamento
        </h1>

        <p className="text-gray-300 mb-6">
          Estamos verificando seu pagamento com o Mercado Pago.
          Assim que for aprovado, sua automação será liberada automaticamente.
        </p>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-5">
          <p className="text-yellow-400 font-bold">
            Status atual
          </p>

          <p className="text-white mt-1">
            {sincronizando ? "Sincronizando pagamento..." : statusPt(status)}
          </p>
        </div>

        {paymentId && (
          <p className="text-gray-500 text-xs break-all">
            Pagamento: {paymentId}
          </p>
        )}

        <button
          onClick={() => {
            sincronizarPagamento();
            verificarStatus();
          }}
          className="mt-6 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-2xl font-bold"
        >
          Verificar agora
        </button>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p>Carregando...</p>}>
      <AguardandoPagamentoContent />
    </Suspense>
  );
}