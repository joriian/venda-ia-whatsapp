"use client";

import { useState } from "react";

export default function AdminPage() {
  const [senha, setSenha] = useState("");
  const [logado, setLogado] = useState(false);
  const [dados, setDados] = useState<any>(null);
  const [erro, setErro] = useState("");

  async function carregar() {
    const res = await fetch("/api/admin/dados", {
      headers: {
        "x-admin-password": senha,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      setErro(data.error || "Erro ao entrar");
      return;
    }

    setDados(data);
    setLogado(true);
    setErro("");
  }

  async function salvarPlano(plano: any) {
    const res = await fetch("/api/admin/planos", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": senha,
      },
      body: JSON.stringify(plano),
    });

    if (!res.ok) {
      alert("Erro ao salvar plano");
      return;
    }

    alert("Plano salvo!");
    carregar();
  }

  if (!logado) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-4">Painel Admin</h1>

          <input
            type="password"
            placeholder="Senha admin"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 mb-4"
          />

          {erro && <p className="text-red-400 mb-3">{erro}</p>}

          <button
            onClick={carregar}
            className="w-full bg-green-600 hover:bg-green-700 p-3 rounded font-bold"
          >
            Entrar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Painel Admin</h1>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Planos</h2>

        <div className="grid gap-4">
          {dados?.planos?.map((plano: any) => (
            <div
              key={plano.id}
              className="bg-zinc-900 border border-zinc-700 p-5 rounded-xl grid grid-cols-1 md:grid-cols-5 gap-3"
            >
              <input
                value={plano.nome}
                onChange={(e) => {
                  plano.nome = e.target.value;
                  setDados({ ...dados });
                }}
                className="bg-zinc-800 p-2 rounded"
              />

              <input
                type="number"
                value={plano.valor}
                onChange={(e) => {
                  plano.valor = e.target.value;
                  setDados({ ...dados });
                }}
                className="bg-zinc-800 p-2 rounded"
              />

              <input
                type="number"
                value={plano.meses}
                onChange={(e) => {
                  plano.meses = e.target.value;
                  setDados({ ...dados });
                }}
                className="bg-zinc-800 p-2 rounded"
              />

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={plano.ativo}
                  onChange={(e) => {
                    plano.ativo = e.target.checked;
                    setDados({ ...dados });
                  }}
                />
                Ativo
              </label>

              <button
                onClick={() => salvarPlano(plano)}
                className="bg-blue-600 hover:bg-blue-700 rounded p-2"
              >
                Salvar
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Clientes</h2>

        <div className="overflow-auto bg-zinc-900 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-zinc-700">
                <th className="p-3">Nome</th>
                <th className="p-3">Email</th>
                <th className="p-3">Plano</th>
                <th className="p-3">Status</th>
                <th className="p-3">Expira</th>
              </tr>
            </thead>
            <tbody>
              {dados?.clientes?.map((c: any) => (
                <tr key={c.id} className="border-b border-zinc-800">
                  <td className="p-3">{c.nome}</td>
                  <td className="p-3">{c.email}</td>
                  <td className="p-3">{c.plano_id}</td>
                  <td className="p-3">{c.status}</td>
                  <td className="p-3">
                    {c.data_expiracao
                      ? new Date(c.data_expiracao).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Instâncias</h2>

        <div className="grid gap-3">
          {dados?.instancias?.map((i: any) => (
            <div
              key={i.id}
              className="bg-zinc-900 border border-zinc-700 p-4 rounded-xl"
            >
              <p>
                <strong>Instância:</strong> {i.instance_name}
              </p>
              <p>
                <strong>Status:</strong> {i.status}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}