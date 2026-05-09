"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("admin@admin.com");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar() {
    if (!email || !senha) {
      alert("Informe email e senha");
      return;
    }

    setLoading(true);

    try {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminNome");
      localStorage.removeItem("adminEmail");
      localStorage.removeItem("adminNivel");
      localStorage.removeItem("adminSessaoExpira");

      const res = await fetch("/api/admin/login", {
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

      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminNome", data.admin.nome);
      localStorage.setItem("adminEmail", data.admin.email);
      localStorage.setItem("adminNivel", data.admin.nivel);
      localStorage.setItem("adminSessaoExpira", data.expiresAt || "");

      window.location.href = "/admin";
    } catch {
      alert("Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2">Login Admin</h1>

        <p className="text-gray-400 text-sm mb-6">
          Acesse o painel administrativo.
        </p>

        <input
          type="email"
          placeholder="Email do admin"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 mb-3"
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") entrar();
          }}
          className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 mb-5"
        />

        <button
          onClick={entrar}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 py-3 rounded-lg font-bold"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </main>
  );
}