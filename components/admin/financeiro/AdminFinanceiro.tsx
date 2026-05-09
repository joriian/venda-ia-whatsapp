"use client";

import { useMemo, useState } from "react";

export default function AdminFinanceiro({
  clientes,
  dashboard,
}: {
  clientes: any[];
  dashboard: any;
}) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");

  const pagamentos = useMemo(() => {
    const todos: any[] = [];

    clientes.forEach((cliente: any) => {
      (cliente.pagamentos_cliente || []).forEach((pagamento: any) => {
        todos.push({
          ...pagamento,
          cliente_nome: cliente.nome,
          cliente_email: cliente.email,
          cliente_telefone: cliente.telefone,
          cliente_status: cliente.status,
        });
      });
    });

    return todos.sort((a: any, b: any) => {
      return (
        new Date(b.criado_em || b.created_at || 0).getTime() -
        new Date(a.criado_em || a.created_at || 0).getTime()
      );
    });
  }, [clientes]);

  const pagamentosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return pagamentos.filter((p: any) => {
      const texto = `
        ${p.cliente_nome || ""}
        ${p.cliente_email || ""}
        ${p.cliente_telefone || ""}
        ${p.status || ""}
        ${p.payment_id || ""}
        ${p.mercado_pago_id || ""}
        ${p.cupom_codigo || ""}
      `.toLowerCase();

      const bateBusca = !termo || texto.includes(termo);

      const bateStatus =
        status === "todos"
          ? true
          : String(p.status || "").toLowerCase() === status;

      return bateBusca && bateStatus;
    });
  }, [pagamentos, busca, status]);

  const receitaAprovada = useMemo(() => {
    return pagamentos
      .filter((p: any) => {
        const s = String(p.status || "").toLowerCase();

        return (
          s === "approved" ||
          s === "aprovado" ||
          s === "ativo"
        );
      })
      .reduce((total: number, p: any) => total + Number(p.valor || 0), 0);
  }, [pagamentos]);

  const pendentes = pagamentos.filter((p: any) => {
    const s = String(p.status || "").toLowerCase();

    return s === "pending" || s === "pendente";
  }).length;

  const aprovados = pagamentos.filter((p: any) => {
    const s = String(p.status || "").toLowerCase();

    return s === "approved" || s === "aprovado" || s === "ativo";
  }).length;

  function dinheiro(valor: any) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function dataPt(data: any) {
    if (!data) return "-";

    return new Date(data).toLocaleDateString("pt-BR");
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div>
            <h2 className="text-3xl font-black">
              Financeiro
            </h2>

            <p className="text-gray-500 mt-2">
              Pesquise pagamentos, acompanhe receita e veja pendências por cliente.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente, email, pagamento..."
              className="bg-[#131313] border border-white/10 rounded-2xl px-4 py-3 outline-none min-w-[300px]"
            />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-[#131313] border border-white/10 rounded-2xl px-4 py-3 outline-none"
            >
              <option value="todos">Todos</option>
              <option value="approved">Aprovados</option>
              <option value="pending">Pendentes</option>
              <option value="rejected">Recusados</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <CardFinanceiro
          titulo="Receita aprovada"
          valor={dinheiro(receitaAprovada || dashboard?.receita_total || 0)}
          destaque="verde"
        />

        <CardFinanceiro
          titulo="Pagamentos"
          valor={pagamentos.length}
        />

        <CardFinanceiro
          titulo="Aprovados"
          valor={aprovados}
          destaque="verde"
        />

        <CardFinanceiro
          titulo="Pendentes"
          valor={pendentes}
          destaque="amarelo"
        />
      </div>

      <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-black">
              Pagamentos
            </h3>

            <p className="text-gray-500 mt-1">
              {pagamentosFiltrados.length} resultado(s)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-white/10 rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#131313] border-b border-white/10 text-left">
                <th className="p-4">Cliente</th>
                <th className="p-4">Status</th>
                <th className="p-4">Valor</th>
                <th className="p-4">Data</th>
                <th className="p-4">Cupom</th>
                <th className="p-4">Pagamento</th>
              </tr>
            </thead>

            <tbody>
              {pagamentosFiltrados.map((p: any, index: number) => (
                <tr
                  key={p.id || index}
                  className="border-b border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="p-4">
                    <p className="font-bold">
                      {p.cliente_nome || "-"}
                    </p>

                    <p className="text-gray-500 text-xs mt-1">
                      {p.cliente_email || "-"}
                    </p>
                  </td>

                  <td className="p-4">
                    <StatusPagamento status={p.status} />
                  </td>

                  <td className="p-4 font-black">
                    {dinheiro(p.valor)}
                  </td>

                  <td className="p-4 text-gray-400">
                    {dataPt(p.criado_em || p.created_at)}
                  </td>

                  <td className="p-4 text-gray-400">
                    {p.cupom_codigo || "-"}
                  </td>

                  <td className="p-4 text-gray-500 break-all max-w-[220px]">
                    {p.payment_id || p.mercado_pago_id || "-"}
                  </td>
                </tr>
              ))}

              {pagamentosFiltrados.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-gray-500"
                  >
                    Nenhum pagamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CardFinanceiro({
  titulo,
  valor,
  destaque,
}: any) {
  const cor =
    destaque === "verde"
      ? "text-green-400"
      : destaque === "amarelo"
      ? "text-yellow-400"
      : "text-white";

  return (
    <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-5">
      <p className="text-gray-500 text-sm">
        {titulo}
      </p>

      <p className={`text-3xl font-black mt-2 ${cor}`}>
        {valor}
      </p>
    </div>
  );
}

function StatusPagamento({
  status,
}: {
  status: string;
}) {
  const s = String(status || "").toLowerCase();

  const classe =
    s === "approved" || s === "aprovado" || s === "ativo"
      ? "bg-green-500/20 text-green-400"
      : s === "pending" || s === "pendente"
      ? "bg-yellow-500/20 text-yellow-400"
      : s === "rejected" || s === "recusado"
      ? "bg-red-500/20 text-red-400"
      : "bg-white/10 text-white";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${classe}`}>
      {status || "-"}
    </span>
  );
}