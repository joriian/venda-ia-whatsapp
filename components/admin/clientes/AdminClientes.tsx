"use client";

import { useMemo, useState } from "react";

import ClientesFiltros from "./ClientesFiltros";
import ClienteCard from "./ClienteCard";

export default function AdminClientes({
  clientes,
  adminToken,
  carregarClientes,
}: any) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [carregandoId, setCarregandoId] = useState("");

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((cliente: any) => {
      const texto = `
        ${cliente.nome || ""}
        ${cliente.email || ""}
        ${cliente.telefone || ""}
        ${cliente.status || ""}
      `.toLowerCase();

      const passouBusca = texto.includes(busca.toLowerCase());

      const passouFiltro =
        filtroStatus === "todos" ? true : cliente.status === filtroStatus;

      return passouBusca && passouFiltro;
    });
  }, [clientes, busca, filtroStatus]);

  async function acaoCliente(clienteId: string, acao: string) {
    try {
      setCarregandoId(`${clienteId}_${acao}`);

      if (acao === "excluir") {
        const confirmar = confirm(
          "Deseja realmente excluir este cliente? Esta ação não pode ser desfeita."
        );

        if (!confirmar) return;

        const res = await fetch("/api/admin/excluir-cliente", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": adminToken,
          },
          body: JSON.stringify({
            cliente_id: clienteId,
          }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          alert(data.error || "Erro ao excluir cliente.");
          return;
        }

        alert("Cliente excluído.");
        await carregarClientes();
        return;
      }

      if (acao === "acessar") {
        const res = await fetch("/api/admin/acessar-cliente", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": adminToken,
          },
          body: JSON.stringify({
            clienteId,
          }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          alert(data.error || "Erro ao acessar cliente.");
          return;
        }

        if (data.url) {
          window.open(data.url, "_blank");
        }

        return;
      }

      const res = await fetch("/api/admin/cliente-acao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          cliente_id: clienteId,
          acao,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.error || "Erro ao executar ação.");
        return;
      }

      if (data.link) {
        await navigator.clipboard.writeText(data.link);
        alert("Link copiado.");
      }

      if (acao === "cobrar") {
        alert("Cobrança enviada.");
      }

      if (acao === "bloquear") {
        alert("Cliente bloqueado.");
      }

      if (acao === "reativar") {
        alert("Cliente reativado.");
      }

      await carregarClientes();
    } catch (error) {
      console.log(error);
      alert("Erro interno.");
    } finally {
      setCarregandoId("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div>
            <h2 className="text-3xl font-black">
              Clientes
            </h2>

            <p className="text-gray-500 mt-2">
              Gerencie suporte, cobrança, acesso e status dos clientes.
            </p>
          </div>
        </div>
      </div>

      <ClientesFiltros
        busca={busca}
        setBusca={setBusca}
        filtroStatus={filtroStatus}
        setFiltroStatus={setFiltroStatus}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <ResumoMini titulo="Total" valor={clientes.length} />

        <ResumoMini
          titulo="Ativos"
          valor={clientes.filter((c: any) => c.status === "ativo").length}
        />

        <ResumoMini
          titulo="Vencidos"
          valor={clientes.filter((c: any) => c.status === "vencido").length}
        />

        <ResumoMini
          titulo="Pendentes"
          valor={
            clientes.filter(
              (c: any) =>
                c.status === "aguardando_pagamento" ||
                c.status === "bloqueado" ||
                c.status === "suspenso"
            ).length
          }
        />
      </div>

      <div className="space-y-5">
        {clientesFiltrados.map((cliente: any) => (
          <ClienteCard
            key={cliente.id}
            cliente={cliente}
            loading={carregandoId.includes(cliente.id)}
            acaoCliente={acaoCliente}
          />
        ))}

        {clientesFiltrados.length === 0 && (
          <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-10 text-center text-gray-500">
            Nenhum cliente encontrado.
          </div>
        )}
      </div>
    </div>
  );
}

function ResumoMini({
  titulo,
  valor,
}: any) {
  return (
    <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-5">
      <p className="text-gray-500 text-sm">
        {titulo}
      </p>

      <p className="text-3xl font-black mt-2">
        {valor}
      </p>
    </div>
  );
}