"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [senha, setSenha] = useState("");
  const [logado, setLogado] = useState(false);
  const [planos, setPlanos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [instancias, setInstancias] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function entrar() {
    const res = await fetch("/api/admin/dados", {
      headers: { "x-admin-password": senha },
    });

    if (!res.ok) {
      alert("Senha incorreta");
      return;
    }

    const data = await res.json();

    setPlanos(data.planos || []);
    setClientes(data.clientes || []);
    setLogado(true);

    carregarDashboard();
    carregarInstancias();

    setInterval(() => {
      carregarDashboard();
      carregarInstancias();
    }, 5000);
  }

  async function recarregarDados() {
    const res = await fetch("/api/admin/dados", {
      headers: { "x-admin-password": senha },
    });

    if (res.ok) {
      const data = await res.json();
      setPlanos(data.planos || []);
      setClientes(data.clientes || []);
    }
  }

  async function carregarDashboard() {
    const res = await fetch("/api/admin/dashboard", {
      headers: { "x-admin-password": senha },
    });

    const data = await res.json();
    setDashboard(data);
  }

  async function carregarInstancias() {
    const res = await fetch("/api/admin/instances");
    const data = await res.json();

    if (Array.isArray(data)) {
      setInstancias(data);
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

  async function acaoCliente(id: string, acao: string) {
    const confirmar =
      acao === "bloquear"
        ? confirm("Tem certeza que deseja bloquear este cliente?")
        : true;

    if (!confirmar) return;

    const res = await fetch("/api/admin/cliente-acao", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": senha,
      },
      body: JSON.stringify({
        cliente_id: id,
        acao,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert("Erro ao executar ação");
      return;
    }

    if (acao === "gerar_link" && data.link) {
      alert("Link de pagamento:\n" + data.link);
    } else {
      alert("Ação realizada com sucesso");
    }

    await recarregarDados();
    await carregarDashboard();
    await carregarInstancias();
  }

  function dinheiro(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
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

      {dashboard && (
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <Card titulo="Receita total" valor={dinheiro(dashboard.receita_total)} />
          <Card titulo="Receita do mês" valor={dinheiro(dashboard.receita_mes)} />
          <Card titulo="Clientes ativos" valor={dashboard.ativos} />
          <Card titulo="Vencendo em 3 dias" valor={dashboard.vencendo} />
          <Card titulo="Clientes vencidos" valor={dashboard.vencidos} />
          <Card titulo="Aguardando pagamento" valor={dashboard.aguardando} />
          <Card titulo="Total de clientes" valor={dashboard.clientes_total} />
          <Card titulo="Pagamentos" valor={dashboard.pagamentos_total} />
        </section>
      )}

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
                <th className="p-3">Ações</th>
              </tr>
            </thead>

            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="border-b border-zinc-800 align-top">
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
                  <td className="p-3">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => acaoCliente(cliente.id, "bloquear")}
                        className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
                      >
                        Bloquear
                      </button>

                      <button
                        onClick={() => acaoCliente(cliente.id, "reativar")}
                        className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
                      >
                        Reativar
                      </button>

                      <button
                        onClick={() => acaoCliente(cliente.id, "gerar_link")}
                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
                      >
                        Link
                      </button>

                      <button
                        onClick={() => acaoCliente(cliente.id, "cobrar")}
                        className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded"
                      >
                        Cobrar
                      </button>
                    </div>
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

function Card({ titulo, valor }: { titulo: string; valor: any }) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <p className="text-gray-400 text-sm">{titulo}</p>
      <p className="text-2xl font-bold mt-2">{valor}</p>
    </div>
  );
}