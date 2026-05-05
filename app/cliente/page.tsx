"use client";

import { useEffect, useState } from "react";

export default function ClientePage() {
  const [status, setStatus] = useState("Carregando...");
  const [bloqueado, setBloqueado] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clienteId = params.get("cliente");

    if (!clienteId) {
      setStatus("Cliente inválido");
      return;
    }

    validar(clienteId);
  }, []);

  async function validar(clienteId: string) {
    const res = await fetch("/api/cliente/validar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clienteId }),
    });

    const data = await res.json();

    if (!data.ativo) {
      setBloqueado(true);
      setStatus("Plano expirado");
      return;
    }

    window.location.reload();
  }

  if (bloqueado) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-zinc-900 p-8 rounded-2xl text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-500">
            Plano expirado
          </h1>

          <p className="text-gray-300 mb-4">
            Seu acesso foi bloqueado. Renove para continuar usando.
          </p>

          <button className="bg-green-600 px-6 py-3 rounded font-bold">
            Renovar Plano
          </button>
        </div>
      </main>
    );
  }

  return null;
}