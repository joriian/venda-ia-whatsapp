"use client";

import { useState } from "react";

const planos = [
  {
    id: "mensal",
    nome: "1 Mês",
    preco: "R$ 29,90",
    descricao: "Acesso por 30 dias",
  },
  {
    id: "trimestral",
    nome: "3 Meses",
    preco: "R$ 79,90",
    descricao: "Acesso por 90 dias",
  },
  {
    id: "semestral",
    nome: "6 Meses",
    preco: "R$ 149,90",
    descricao: "Acesso por 180 dias",
  },
  {
    id: "anual",
    nome: "1 Ano",
    preco: "R$ 279,90",
    descricao: "Acesso por 12 meses",
  },
];

export default function Home() {
  const [loadingPlano, setLoadingPlano] = useState<string | null>(null);

  async function comprar(planoId: string) {
    setLoadingPlano(planoId);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planoId,
          email: "cliente@email.com",
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
      setLoadingPlano(null);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-5xl w-full text-center">
        <h1 className="text-4xl font-bold mb-4">
          IA de Atendimento para WhatsApp
        </h1>

        <p className="text-gray-300 mb-10">
          Automatize seu atendimento, responda clientes e venda mais pelo WhatsApp.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {planos.map((plano) => (
            <div
              key={plano.id}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6"
            >
              <h2 className="text-2xl font-bold">{plano.nome}</h2>

              <p className="text-3xl font-bold mt-4">{plano.preco}</p>

              <p className="text-gray-400 mt-2">{plano.descricao}</p>

              <button
                onClick={() => comprar(plano.id)}
                disabled={loadingPlano !== null}
                className="mt-6 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-5 py-3 rounded-lg font-semibold"
              >
                {loadingPlano === plano.id
                  ? "Gerando..."
                  : "Assinar agora"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}