"use client";

import { useEffect, useState } from "react";

export default function ClientePage() {
  const [clienteId, setClienteId] = useState("");
  const [clienteToken, setClienteToken] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [status, setStatus] = useState("Carregando...");

  useEffect(() => {
    iniciarSessao();
  }, []);

  async function iniciar(id: string, token: string, instance: string) {
    console.log("CLIENTE:", id);
    console.log("TOKEN:", token);
    console.log("INSTANCE:", instance);
  }

  async function verificarStatus(instance: string) {
    try {
      const res = await fetch("/api/admin/instances");
      const data = await res.json();

      const atual = data.find((i: any) => i.instance === instance);

      if (!atual) {
        setStatus("Desconectado");
        return;
      }

      setStatus(atual.conectado ? "Conectado" : "Desconectado");
    } catch (error) {
      console.error(error);
    }
  }

  function limparSessaoLocal() {
    localStorage.removeItem("clienteToken");
    localStorage.removeItem("clienteId");
    localStorage.removeItem("clienteNome");
    localStorage.removeItem("clienteEmail");
  }

  async function iniciarSessao() {
    const params = new URLSearchParams(window.location.search);

    const tokenUrl = params.get("token");
    const clienteUrl = params.get("cliente");

    if (tokenUrl && clienteUrl) {
      localStorage.setItem("clienteToken", tokenUrl);
      localStorage.setItem("clienteId", clienteUrl);
    }

    const token = tokenUrl || localStorage.getItem("clienteToken");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      const res = await fetch("/api/cliente/sessao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        limparSessaoLocal();
        window.location.href = "/login";
        return;
      }

      const id = data.clienteId;
      const instance = `cliente_${id.replace(/-/g, "")}`;

      setClienteId(id);
      setClienteToken(token);
      setInstanceName(instance);

      localStorage.setItem("clienteId", id);
      localStorage.setItem("clienteNome", data.nome || "");
      localStorage.setItem("clienteEmail", data.email || "");

      await iniciar(id, token, instance);

      verificarStatus(instance);

      const interval = setInterval(() => {
        verificarStatus(instance);
      }, 5000);

      return () => clearInterval(interval);
    } catch (error) {
      console.error(error);
      limparSessaoLocal();
      window.location.href = "/login";
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
          <h1 className="text-3xl font-bold mb-4">
            Painel do Cliente
          </h1>

          <div className="grid gap-4">
            <div className="bg-zinc-800 rounded-xl p-4">
              <p className="text-gray-400 text-sm">
                Cliente ID
              </p>

              <p className="font-bold break-all">
                {clienteId || "-"}
              </p>
            </div>

            <div className="bg-zinc-800 rounded-xl p-4">
              <p className="text-gray-400 text-sm">
                Instância
              </p>

              <p className="font-bold break-all">
                {instanceName || "-"}
              </p>
            </div>

            <div className="bg-zinc-800 rounded-xl p-4">
              <p className="text-gray-400 text-sm">
                Status WhatsApp
              </p>

              <p
                className={`font-bold ${
                  status === "Conectado"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {status}
              </p>
            </div>

            <button
              onClick={() => {
                limparSessaoLocal();
                window.location.href = "/login";
              }}
              className="bg-red-600 hover:bg-red-700 py-3 rounded-xl font-bold mt-4"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}