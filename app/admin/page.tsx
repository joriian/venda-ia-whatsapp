"use client";

import { useEffect, useMemo, useState } from "react";

export default function AdminPage() {
  const [senha, setSenha] = useState("");
  const [logado, setLogado] = useState(false);
  const [planos, setPlanos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [instancias, setInstancias] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [buscaCliente, setBuscaCliente] = useState("");
  const [filtroStatusCliente, setFiltroStatusCliente] = useState("todos");
  const [paginaClientes, setPaginaClientes] = useState(1);

  const [buscaInstancia, setBuscaInstancia] = useState("");
  const [filtroStatusInstancia, setFiltroStatusInstancia] = useState("todos");
  const [paginaInstancias, setPaginaInstancias] = useState(1);

  const porPagina = 10;

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

  const clientesFiltrados = useMemo(() => {
    const busca = buscaCliente.toLowerCase().trim();

    return clientes.filter((cliente) => {
      const texto = [
        cliente.nome,
        cliente.email,
        cliente.telefone,
        cliente.status,
        cliente.plano_id,
        cliente.id,
      ]
        .join(" ")
        .toLowerCase();

      const bateBusca = !busca || texto.includes(busca);
      const bateStatus =
        filtroStatusCliente === "todos" || cliente.status === filtroStatusCliente;

      return bateBusca && bateStatus;
    });
  }, [clientes, buscaCliente, filtroStatusCliente]);

  const totalPaginasClientes = Math.max(
    1,
    Math.ceil(clientesFiltrados.length / porPagina)
  );

  const clientesPaginados = clientesFiltrados.slice(
    (paginaClientes - 1) * porPagina,
    paginaClientes * porPagina
  );

  const instanciasFiltradas = useMemo(() => {
    const busca = buscaInstancia.toLowerCase().trim();

    return instancias.filter((instancia) => {
      const texto = [
        instancia.instance,
        instancia.status,
        instancia.numero,
        instancia.nome,
      ]
        .join(" ")
        .toLowerCase();

      const bateBusca = !busca || texto.includes(busca);
      const bateStatus =
        filtroStatusInstancia === "todos" ||
        (filtroStatusInstancia === "conectado" && instancia.conectado) ||
        (filtroStatusInstancia === "desconectado" && !instancia.conectado);

      return bateBusca && bateStatus;
    });
  }, [instancias, buscaInstancia, filtroStatusInstancia]);

  const totalPaginasInstancias = Math.max(
    1,
    Math.ceil(instanciasFiltradas.length / porPagina)
  );

  const instanciasPaginadas = instanciasFiltradas.slice(
    (paginaInstancias - 1) * porPagina,
    paginaInstancias * porPagina
  );

  useEffect(() => {
    setPaginaClientes(1);
  }, [buscaCliente, filtroStatusCliente]);

  useEffect(() => {
    setPaginaInstancias(1);
  }, [buscaInstancia, filtroStatusInstancia]);

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Painel Admin</h1>
          <p className="text-gray-400 text-sm mt-1">
            Gestão de clientes, planos, instâncias e pagamentos.
          </p>
        </div>

        <button
          onClick={async () => {
            await recarregarDados();
            await carregarDashboard();
            await carregarInstancias();
          }}
          className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-5 py-3 rounded-lg font-semibold"
        >
          Atualizar painel
        </button>
      </div>

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
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold">Clientes</h2>
            <p className="text-gray-400 text-sm">
              Exibindo {clientesPaginados.length} de {clientesFiltrados.length} clientes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full md:w-auto">
            <input
              value={buscaCliente}
              onChange={(e) => setBuscaCliente(e.target.value)}
              placeholder="Pesquisar cliente, email, telefone..."
              className="p-3 rounded bg-zinc-800 border border-zinc-700 min-w-[280px]"
            />

            <select
              value={filtroStatusCliente}
              onChange={(e) => setFiltroStatusCliente(e.target.value)}
              className="p-3 rounded bg-zinc-800 border border-zinc-700"
            >
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="vencido">Vencido</option>
              <option value="aguardando_pagamento">Aguardando pagamento</option>
            </select>
          </div>
        </div>

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
              {clientesPaginados.map((cliente) => (
                <tr key={cliente.id} className="border-b border-zinc-800 align-top">
                  <td className="p-3">{cliente.nome}</td>
                  <td className="p-3">{cliente.email}</td>
                  <td className="p-3">{cliente.telefone || "-"}</td>
                  <td className="p-3">{cliente.plano_id}</td>
                  <td className="p-3">
                    <StatusBadge status={cliente.status} />
                  </td>
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

              {clientesPaginados.length === 0 && (
                <tr>
                  <td className="p-5 text-center text-gray-400" colSpan={8}>
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Paginacao
          pagina={paginaClientes}
          totalPaginas={totalPaginasClientes}
          setPagina={setPaginaClientes}
        />
      </section>

      <section>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold">Instâncias em Tempo Real</h2>
            <p className="text-gray-400 text-sm">
              Exibindo {instanciasPaginadas.length} de {instanciasFiltradas.length} instâncias.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full md:w-auto">
            <input
              value={buscaInstancia}
              onChange={(e) => setBuscaInstancia(e.target.value)}
              placeholder="Pesquisar instância, número, nome..."
              className="p-3 rounded bg-zinc-800 border border-zinc-700 min-w-[280px]"
            />

            <select
              value={filtroStatusInstancia}
              onChange={(e) => setFiltroStatusInstancia(e.target.value)}
              className="p-3 rounded bg-zinc-800 border border-zinc-700"
            >
              <option value="todos">Todas</option>
              <option value="conectado">Conectadas</option>
              <option value="desconectado">Desconectadas</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4">
          {instanciasPaginadas.map((instancia, index) => (
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

          {instanciasPaginadas.length === 0 && (
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 text-center text-gray-400">
              Nenhuma instância encontrada.
            </div>
          )}
        </div>

        <Paginacao
          pagina={paginaInstancias}
          totalPaginas={totalPaginasInstancias}
          setPagina={setPaginaInstancias}
        />
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

function StatusBadge({ status }: { status: string }) {
  const cor =
    status === "ativo"
      ? "bg-green-900/40 text-green-400 border-green-700"
      : status === "vencido"
      ? "bg-red-900/40 text-red-400 border-red-700"
      : "bg-yellow-900/40 text-yellow-400 border-yellow-700";

  return (
    <span className={`px-3 py-1 rounded-full border text-xs font-bold ${cor}`}>
      {status}
    </span>
  );
}

function Paginacao({
  pagina,
  totalPaginas,
  setPagina,
}: {
  pagina: number;
  totalPaginas: number;
  setPagina: (pagina: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 mt-5">
      <button
        onClick={() => setPagina(Math.max(1, pagina - 1))}
        disabled={pagina <= 1}
        className="px-4 py-2 rounded bg-zinc-800 border border-zinc-700 disabled:opacity-40"
      >
        Anterior
      </button>

      <span className="text-gray-300 text-sm">
        Página {pagina} de {totalPaginas}
      </span>

      <button
        onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))}
        disabled={pagina >= totalPaginas}
        className="px-4 py-2 rounded bg-zinc-800 border border-zinc-700 disabled:opacity-40"
      >
        Próxima
      </button>
    </div>
  );
}