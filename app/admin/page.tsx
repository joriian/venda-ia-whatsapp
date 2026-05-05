"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [senha, setSenha] = useState("");
  const [logado, setLogado] = useState(false);
  const [planos, setPlanos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [instancias, setInstancias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function entrar() {
    if (!senha) {
      alert("Digite a senha");
      return;
    }

    const res = await fetch("/api/admin/dados", {
      headers: {
        "x-admin-password": senha,
      },
    });

    if (!res.ok) {
      alert("Senha incorreta");
      return;
    }

    const data = await res.json();

    setPlanos(data.planos || []);
    setClientes(data.clientes || []);
    setLogado(true);
    carregarInstancias();

    setInterval(() => {
      carregarInstancias();
    }, 5000);
  }

  async function carregarInstancias() {
    try {
      const res = await fetch("/api/admin/instances");
      const data = await res.json();

      if (Array.isArray(data)) {
        setInstancias(data);
      }
    } catch (error) {
      console.log("Erro ao carregar instâncias", error);
    }
  }

  async function salvarPlano(plano: any) {
    setLoading(true);

    const res = await fetch("/api/admin/planos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": senha,
      },
      body: JSON.stringify(plano),
    });

    setLoading(false);

    if (!res.ok) {
      alert("Erro ao salvar plano");
      return;
    }

    alert("Plano salvo");
  }

  if (!logado) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-5">Painel Admin</h1>

          <input
            type="password"
            placeholder="Senha do admin"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 mb-4"
          />

          <button
            onClick={entrar}
            className="w-full bg-green-600 hover:bg-green-700 py-3 rounded font-bold"
          >
            Entrar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-8">Painel Admin</h1>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Planos</h2>

        <div className="grid gap-4">
          {planos.map((plano, index) => (
            <div
              key={plano.id}
              className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-center"
            >
              <input
                value={plano.nome}
                onChange={(e) => {
                  const novo = [...planos];
                  novo[index].nome = e.target.value;
                  setPlanos(novo);
                }}
                className="p-3 rounded bg-zinc-800 border border-zinc-700"
              />

              <input
                value={plano.valor}
                onChange={(e) => {
                  const novo = [...planos];
                  novo[index].valor = e.target.value;
                  setPlanos(novo);
                }}
                className="p-3 rounded bg-zinc-800 border border-zinc-700"
              />

              <input
                value={plano.meses}
                onChange={(e) => {
                  const novo = [...planos];
                  novo[index].meses = Number(e.target.value);
                  setPlanos(novo);
                }}
                className="p-3 rounded bg-zinc-800 border border-zinc-700"
              />

              <label className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={plano.ativo}
                  onChange={(e) => {
                    const novo = [...planos];
                    novo[index].ativo = e.target.checked;
                    setPlanos(novo);
                  }}
                />
                Ativo
              </label>

              <button
                onClick={() => salvarPlano(plano)}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 py-3 rounded font-bold"
              >
                Salvar
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Clientes</h2>

        <div className="overflow-x-auto bg-zinc-900 border border-zinc-700 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left">
                <th className="p-3">Nome</th>
                <th className="p-3">Email</th>
                <th className="p-3">Telefone</th>
                <th className="p-3">Plano</th>
                <th className="p-3">Status</th>
                <th className="p-3">Expira</th>
                <th className="p-3">Área</th>
              </tr>
            </thead>

            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="border-b border-zinc-800">
                  <td className="p-3">{cliente.nome}</td>
                  <td className="p-3">{cliente.email}</td>
                  <td className="p-3">{cliente.telefone || "-"}</td>
                  <td className="p-3">{cliente.plano_id}</td>
                  <td className="p-3">{cliente.status}</td>
                  <td className="p-3">
                    {cliente.data_expiracao
                      ? new Date(cliente.data_expiracao).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td className="p-3">
                    <a
                      href={`/cliente?cliente=${cliente.id}`}
                      target="_blank"
                      className="text-green-400 underline"
                    >
                      Abrir
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Instâncias em Tempo Real</h2>

        <div className="grid gap-4">
          {instancias.map((instancia, index) => (
            <div
              key={index}
              className={`rounded-xl border p-4 ${
                instancia.conectado
                  ? "border-green-600 bg-green-900/20"
                  : "border-red-600 bg-red-900/20"
              }`}
            >
              <p>
                <strong>Instância:</strong> {instancia.instance}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={
                    instancia.conectado ? "text-green-400" : "text-red-400"
                  }
                >
                  {instancia.conectado ? "CONECTADO" : "DESCONECTADO"}
                </span>
              </p>

              {instancia.nome && (
                <p>
                  <strong>Nome:</strong> {instancia.nome}
                </p>
              )}

              {instancia.numero && (
                <p>
                  <strong>Número:</strong> {instancia.numero}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}