"use client";

import {
  useMemo,
  useState,
} from "react";

export default function AdminClientes({
  clientes,
  adminToken,
  carregarClientes,
}: any) {

  const [busca, setBusca] =
    useState("");

  const [filtro, setFiltro] =
    useState("todos");

  const [carregandoId, setCarregandoId] =
    useState("");

  const clientesFiltrados =
    useMemo(() => {

      return clientes.filter(
        (cliente: any) => {

          const texto = `
            ${cliente.nome || ""}
            ${cliente.email || ""}
            ${cliente.telefone || ""}
            ${cliente.status || ""}
          `.toLowerCase();

          const passouBusca =
            texto.includes(
              busca.toLowerCase()
            );

          const passouFiltro =
            filtro === "todos"
              ? true
              : cliente.status === filtro;

          return (
            passouBusca &&
            passouFiltro
          );
        }
      );

    }, [
      clientes,
      busca,
      filtro,
    ]);

  async function acaoCliente(
    clienteId: string,
    acao: string
  ) {
    try {

      setCarregandoId(
        `${clienteId}_${acao}`
      );

      // EXCLUIR

      if (acao === "excluir") {

        const confirmar =
          confirm(
            "Deseja realmente excluir este cliente?"
          );

        if (!confirmar) {
          return;
        }

        const res = await fetch(
          "/api/admin/excluir-cliente",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-admin-token":
                adminToken,
            },

            body: JSON.stringify({
              cliente_id:
                clienteId,
            }),
          }
        );

        const data =
          await res.json();

        if (!res.ok || data.error) {

          alert(
            data.error ||
              "Erro ao excluir cliente."
          );

          return;
        }

        alert(
          "Cliente excluído."
        );

        await carregarClientes();

        return;
      }

      // ACESSAR CLIENTE

      if (acao === "acessar") {

        const res = await fetch(
          "/api/admin/acessar-cliente",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-admin-token":
                adminToken,
            },

            body: JSON.stringify({
              clienteId,
            }),
          }
        );

        const data =
          await res.json();

        if (!res.ok || data.error) {

          alert(
            data.error ||
              "Erro ao acessar cliente."
          );

          return;
        }

        if (data.url) {

          window.open(
            data.url,
            "_blank"
          );

        }

        return;
      }

      // AÇÕES PADRÃO

      const res = await fetch(
        "/api/admin/cliente-acao",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-admin-token":
              adminToken,
          },

          body: JSON.stringify({
            cliente_id:
              clienteId,

            acao,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok || data.error) {

        alert(
          data.error ||
            "Erro ao executar ação."
        );

        return;
      }

      if (data.link) {

        await navigator.clipboard.writeText(
          data.link
        );

        alert(
          "Link copiado."
        );

      }

      if (acao === "cobrar") {
        alert(
          "Cobrança enviada."
        );
      }

      if (acao === "bloquear") {
        alert(
          "Cliente bloqueado."
        );
      }

      if (acao === "reativar") {
        alert(
          "Cliente reativado."
        );
      }

      await carregarClientes();

    } catch (error) {

      console.log(error);

      alert(
        "Erro interno."
      );

    } finally {

      setCarregandoId("");

    }
  }

  return (
    <div className="space-y-6">

      {/* TOPO */}

      <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">

        <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">

          <div>

            <h2 className="text-3xl font-black">
              Clientes
            </h2>

            <p className="text-gray-500 mt-2">
              Gerencie suporte, cobrança e acesso dos clientes.
            </p>

          </div>

          <div className="flex flex-col md:flex-row gap-3">

            <input
              value={busca}
              onChange={(e) =>
                setBusca(
                  e.target.value
                )
              }
              placeholder="Buscar cliente..."
              className="bg-[#131313] border border-white/10 rounded-2xl px-4 py-3 outline-none min-w-[280px]"
            />

            <select
              value={filtro}
              onChange={(e) =>
                setFiltro(
                  e.target.value
                )
              }
              className="bg-[#131313] border border-white/10 rounded-2xl px-4 py-3 outline-none"
            >
              <option value="todos">
                Todos
              </option>

              <option value="ativo">
                Ativos
              </option>

              <option value="vencido">
                Vencidos
              </option>

              <option value="aguardando_pagamento">
                Aguardando
              </option>

            </select>

          </div>

        </div>

      </div>

      {/* RESUMOS */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        <ResumoMini
          titulo="Total"
          valor={
            clientes.length
          }
        />

        <ResumoMini
          titulo="Ativos"
          valor={
            clientes.filter(
              (c: any) =>
                c.status ===
                "ativo"
            ).length
          }
        />

        <ResumoMini
          titulo="Pendentes"
          valor={
            clientes.filter(
              (c: any) =>
                c.status !==
                "ativo"
            ).length
          }
        />

      </div>

      {/* CLIENTES */}

      <div className="space-y-5">

        {clientesFiltrados.map(
          (cliente: any) => {

            const loading =
              carregandoId.includes(
                cliente.id
              );

            return (
              <div
                key={cliente.id}
                className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6"
              >

                <div className="flex flex-col 2xl:flex-row gap-6 2xl:items-start 2xl:justify-between">

                  {/* ESQUERDA */}

                  <div className="flex-1">

                    <div className="flex items-center gap-3 flex-wrap">

                      <h3 className="text-2xl font-black">
                        {
                          cliente.nome ||
                          "Cliente"
                        }
                      </h3>

                      <StatusCliente
                        status={
                          cliente.status
                        }
                      />

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">

                      <InfoCliente
                        label="Email"
                        value={
                          cliente.email ||
                          "-"
                        }
                      />

                      <InfoCliente
                        label="Telefone"
                        value={
                          cliente.telefone ||
                          "-"
                        }
                      />

                      <InfoCliente
                        label="Expiração"
                        value={
                          cliente.data_expiracao
                            ? new Date(
                                cliente.data_expiracao
                              ).toLocaleDateString(
                                "pt-BR"
                              )
                            : "-"
                        }
                      />

                    </div>

                    {/* SERVIÇOS */}

                    <div className="flex flex-wrap gap-3 mt-5">

                      {(
                        cliente.servicos_cliente ||
                        []
                      ).map(
                        (
                          servico: any,
                          index: number
                        ) => (
                          <div
                            key={index}
                            className="bg-[#131313] border border-white/5 rounded-xl px-4 py-3"
                          >

                            <p className="text-xs text-gray-500">
                              Serviço
                            </p>

                            <p className="font-bold mt-1">
                              {
                                servico
                                  ?.servicos_ia
                                  ?.nome
                              }
                            </p>

                          </div>
                        )
                      )}

                    </div>

                  </div>

                  {/* AÇÕES */}

                  <div className="flex flex-wrap gap-3 2xl:max-w-[420px]">

                    <AcaoClienteBtn
                      texto="Abrir"
                      cor="green"
                      loading={loading}
                      onClick={() =>
                        acaoCliente(
                          cliente.id,
                          "acessar"
                        )
                      }
                    />

                    <AcaoClienteBtn
                      texto="Cobrar"
                      cor="yellow"
                      loading={loading}
                      onClick={() =>
                        acaoCliente(
                          cliente.id,
                          "cobrar"
                        )
                      }
                    />

                    <AcaoClienteBtn
                      texto="Link"
                      cor="blue"
                      loading={loading}
                      onClick={() =>
                        acaoCliente(
                          cliente.id,
                          "gerar_link"
                        )
                      }
                    />

                    {cliente.status ===
                    "ativo" ? (
                      <AcaoClienteBtn
                        texto="Bloquear"
                        cor="orange"
                        loading={loading}
                        onClick={() =>
                          acaoCliente(
                            cliente.id,
                            "bloquear"
                          )
                        }
                      />
                    ) : (
                      <AcaoClienteBtn
                        texto="Reativar"
                        cor="purple"
                        loading={loading}
                        onClick={() =>
                          acaoCliente(
                            cliente.id,
                            "reativar"
                          )
                        }
                      />
                    )}

                    <AcaoClienteBtn
                      texto="Excluir"
                      cor="red"
                      loading={loading}
                      onClick={() =>
                        acaoCliente(
                          cliente.id,
                          "excluir"
                        )
                      }
                    />

                  </div>

                </div>

              </div>
            );
          }
        )}

        {clientesFiltrados.length ===
          0 && (
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

function InfoCliente({
  label,
  value,
}: any) {
  return (
    <div className="bg-[#131313] border border-white/5 rounded-2xl p-4">

      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="font-bold mt-1 break-all">
        {value}
      </p>

    </div>
  );
}

function StatusCliente({
  status,
}: any) {

  const estilos: any = {

    ativo:
      "bg-green-500/20 text-green-400",

    vencido:
      "bg-red-500/20 text-red-400",

    aguardando_pagamento:
      "bg-yellow-500/20 text-yellow-400",

  };

  return (
    <div
      className={`px-4 py-2 rounded-full text-sm font-bold ${
        estilos[status] ||
        "bg-white/10 text-white"
      }`}
    >
      {status || "Sem status"}
    </div>
  );
}

function AcaoClienteBtn({
  texto,
  onClick,
  cor,
  loading,
}: any) {

  const cores: any = {

    green:
      "bg-green-500/20 text-green-400 hover:bg-green-500/30",

    blue:
      "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30",

    yellow:
      "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30",

    orange:
      "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30",

    purple:
      "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30",

    red:
      "bg-red-500/20 text-red-400 hover:bg-red-500/30",

  };

  return (
    <button
      disabled={loading}
      onClick={onClick}
      className={`px-4 py-3 rounded-xl font-bold transition-all disabled:opacity-50 ${cores[cor]}`}
    >
      {loading
        ? "Carregando..."
        : texto}
    </button>
  );
}