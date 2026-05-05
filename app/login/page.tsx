"use client";

import { useState } from "react";

export default function LoginClientePage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar() {
    if (!email || !senha) {
      alert("Informe email e senha");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/cliente/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, senha }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.error || "Erro ao entrar");
        return;
      }

      localStorage.setItem("clienteId", data.clienteId);
      localStorage.setItem("clienteNome", data.nome || "");
      localStorage.setItem("clienteEmail", data.email || "");

      window.location.href = "/cliente";
    } catch (error) {
      alert("Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2">Área do Cliente</h1>

        <p className="text-gray-400 text-sm mb-6">
          Entre com seu email e senha para gerenciar seu WhatsApp.
        </p>

        <input
          type="email"
          placeholder="Seu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 mb-3"
        />

        <input
          type="password"
          placeholder="Sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 mb-5"
        />

        <button
          onClick={entrar}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 py-3 rounded-lg font-bold"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Senha inicial: 123456
        </p>
      </div>
    </main>
  );
}