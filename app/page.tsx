"use client";

import { useEffect, useState } from "react";

type Plano = {
  id: string;
  nome: string;
  meses: number;
  valor: number;
};

export default function Home() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loadingPlano, setLoadingPlano] = useState<string | null>(null);

  // 🔥 dados do cliente (AGORA REAL)
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  useEffect(() => {
    async function carregarPlanos() {
      const res = await fetch("/api/planos");
      const data = await res.json();

      if (Array.isArray(data)) {
        setPlanos(data);
      }
    }

    carregarPlanos();
  }, []);

  async function comprar(planoId: string) {
    if (!nome || !email || !telefone) {
      alert("Preencha todos os campos antes de continuar");
      return;
    }

    setLoadingPlano(planoId);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planoId,
          nome,
          email,
          telefone,
        }),
      });

      const data = await res.json();

      if (!data.init_point) {
        alert(data.error || "Erro ao gerar pagamento");
        return;
      }

      window.location.href = data.init_point;
    } catch (error) {
      alert("Erro ao iniciar pagamento");
      console.error(error);
    } finally {
      setLoadingPlano(null);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-10">
      <div className="max-w-6xl w-full text-center">
        <h1 className="text-4xl font-bold mb-4">
          IA de Atendimento para WhatsApp
        </h1>

        <p className="text-gray-300 mb-8">
          Automatize seu atendimento e responda clientes 24h por dia.
        </p>

        {/* 🔥 FORMULÁRIO */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 mb-10 max-w-xl mx-auto">
          <h2 className="text-xl font-bold mb-4">
            Seus dados
          </h2>

          <input
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full mb-3 p-3 rounded bg-zinc-800 border border-zinc-700"
          />

          <input
            placeholder="Seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-3 p-3 rounded bg-zinc-800 border border-zinc-700"
          />

          <input
            placeholder="WhatsApp (com DDD)"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="w-full p-3 rounded bg-zinc-800 border border-zinc-700"
          />
        </div>

        {/* 🔥 PLANOS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {planos.map((plano) => (
            <div
              key={plano.id}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6"
            >
              <h2 className="text-2xl font-bold">{plano.nome}</h2>

              <p className="text-3xl font-bold mt-4">
                {Number(plano.valor).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>

              <p className="text-gray-400 mt-2">
                Acesso por {plano.meses}{" "}
                {plano.meses === 1 ? "mês" : "meses"}
              </p>

              {/* 🔥 BOTÃO + AVISO PIX */}
              <div className="mt-6">
                <button
                  onClick={() => comprar(plano.id)}
                  disabled={loadingPlano !== null}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-5 py-3 rounded-lg font-semibold"
                >
                  {loadingPlano === plano.id
                    ? "Gerando..."
                    : "Pagar e conectar WhatsApp"}
                </button>

                <p className="text-xs text-gray-400 mt-3">
                  Após pagar o PIX, clique em{" "}
                  <strong>“Voltar ao site”</strong> para continuar.
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}