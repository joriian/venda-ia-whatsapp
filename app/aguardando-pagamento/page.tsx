"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function AguardandoContent() {
  const params = useSearchParams();

  const clienteId = params.get("cliente");
  const token = params.get("token");

  const [status, setStatus] =
    useState("aguardando_pagamento");

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

  useEffect(() => {
    if (!clienteId) return;

    async function verificar() {
      try {
        const res = await fetch(
          `/api/cliente/status?cliente=${clienteId}`
        );

        const data = await res.json();

        if (data.status) {
          setStatus(data.status);
        }

        if (data.status === "ativo") {
          window.location.href =
            `/sucesso?cliente=${clienteId}&token=${token}`;
        }
      } catch (error) {
        console.log(error);
      }
    }

    verificar();

    const interval = setInterval(
      verificar,
      3000
    );

    return () =>
      clearInterval(interval);
  }, [clienteId, token]);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-10 text-center max-w-lg w-full">
        <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />

        <h1 className="text-4xl font-black mb-4">
          Aguardando pagamento
        </h1>

        <p className="text-gray-300 mb-6">
          Assim que o Mercado Pago confirmar
          o pagamento, sua automação será
          ativada automaticamente.
        </p>

        <div className="bg-yellow-900/30 border border-yellow-700 rounded-2xl p-4">
          <p className="text-yellow-400 font-bold">
            Status:
          </p>

          <p className="text-white mt-1 capitalize">
            {status.replaceAll("_", " ")}
          </p>
        </div>

        <p className="text-gray-500 text-sm mt-6">
          Esta tela atualiza automaticamente.
        </p>
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