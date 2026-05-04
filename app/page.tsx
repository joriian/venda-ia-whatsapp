"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);

  async function comprar() {
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: "Cliente Teste",
          email: "teste@email.com",
          telefone: "999999999",
          plano: "Plano Mensal",
          valor: 29.9,
        }),
      });

      const data = await res.json();

      if (!data.init_point) {
        alert(data.error || "Erro ao gerar pagamento");
        console.log("ERRO CHECKOUT:", data);
        return;
      }

      window.location.href = data.init_point;
    } catch (error) {
      alert("Erro ao conectar com o checkout");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">
          IA de Atendimento para WhatsApp
        </h1>

        <p className="text-gray-300 max-w-md">
          Automatize seu atendimento, responda clientes e venda mais pelo WhatsApp.
        </p>

        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-700">
          <h2 className="text-2xl font-semibold">Plano Mensal</h2>

          <p className="text-4xl font-bold mt-4">
            R$ 29,90
          </p>

          <p className="text-gray-400 mt-2">
            Acesso inicial por 30 dias
          </p>

          <button
            onClick={comprar}
            disabled={loading}
            className="mt-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-8 py-3 rounded-lg text-lg font-semibold"
          >
            {loading ? "Gerando pagamento..." : "Assinar agora"}
          </button>
        </div>
      </div>
    </main>
  );
}