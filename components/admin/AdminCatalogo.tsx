"use client";

import { useMemo, useState } from "react";

interface Props {
  servicos: any[];
  planos: any[];
  salvarServico: (dados: any) => Promise<void>;
  salvarPlano: (dados: any) => Promise<void>;
  editarServico: (servico: any) => void;
  editarPlano: (plano: any) => void;
  excluirServico: (id: string) => Promise<void>;
  excluirPlano: (id: string) => Promise<void>;
}

export default function AdminCatalogo({
  servicos,
  planos,
  salvarServico,
  salvarPlano,
  editarServico,
  editarPlano,
  excluirServico,
  excluirPlano,
}: Props) {
  const [busca, setBusca] = useState("");

  const servicosFiltrados = useMemo(() => {
    return (servicos || []).filter((servico: any) => {
      const texto = `
        ${servico.nome || ""}
        ${servico.slug || ""}
        ${servico.descricao || ""}
        ${servico.workflow_tipo || ""}
      `.toLowerCase();

      return texto.includes(busca.toLowerCase());
    });
  }, [servicos, busca]);

  function moeda(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
        <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Serviços e automações
            </h2>

            <p className="text-gray-400 text-sm mt-1">
              Gerencie serviços, workflows n8n, webhooks e integração Evolution.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => editarServico(null)}
              className="bg-purple-600 hover:bg-purple-700 px-5 py-3 rounded-2xl font-bold"
            >
              Novo serviço
            </button>

            <button
              onClick={() => editarPlano(null)}
              className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-2xl font-bold"
            >
              Novo plano
            </button>
          </div>
        </div>

        <div className="mt-5">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar serviço, workflow, tipo..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3"
          />
        </div>
      </div>

      <div className="grid gap-5">
        {servicosFiltrados.map((servico: any) => {
          const planosServico = (planos || []).filter(
            (plano: any) => plano.servico_id === servico.id
          );

          return (
            <div
              key={servico.id}
              className="bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden"
            >
              <div className="p-5 border-b border-zinc-800">
                <div className="flex flex-col 2xl:flex-row gap-5 2xl:items-start 2xl:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <h3 className="text-2xl font-bold">
                        {servico.nome}
                      </h3>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          servico.ativo
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {servico.ativo ? "ATIVO" : "INATIVO"}
                      </span>

                      <span className="bg-zinc-800 px-3 py-1 rounded-full text-xs font-bold text-gray-300">
                        {servico.workflow_tipo || "whatsapp"}
                      </span>
                    </div>

                    <p className="text-gray-400 text-sm leading-relaxed">
                      {servico.descricao || "Sem descrição"}
                    </p>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => editarServico(servico)}
                      className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl font-bold text-sm"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => excluirServico(servico.id)}
                      className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl font-bold text-sm"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4 gap-4 mt-5">
                  <div className="bg-zinc-800 rounded-2xl p-4 border border-zinc-700">
                    <p className="text-gray-400 text-xs mb-1">
                      Workflow ID
                    </p>

                    <p className="font-mono text-sm break-all">
                      {servico.workflow_id || "-"}
                    </p>
                  </div>

                  <div className="bg-zinc-800 rounded-2xl p-4 border border-zinc-700">
                    <p className="text-gray-400 text-xs mb-1">
                      Webhook URL
                    </p>

                    <p className="font-mono text-sm break-all">
                      {servico.webhook_url || "-"}
                    </p>
                  </div>

                  <div className="bg-zinc-800 rounded-2xl p-4 border border-zinc-700">
                    <p className="text-gray-400 text-xs mb-1">
                      Eventos Evolution
                    </p>

                    <p className="text-sm break-all">
                      {Array.isArray(servico.evolution_events)
                        ? servico.evolution_events.join(", ")
                        : "-"}
                    </p>
                  </div>

                  <div className="bg-zinc-800 rounded-2xl p-4 border border-zinc-700">
                    <p className="text-gray-400 text-xs mb-1">
                      Integração
                    </p>

                    <div className="space-y-1 text-sm">
                      <p>
                        Webhook:{" "}
                        <span className="font-bold">
                          {servico.evolution_webhook_enabled
                            ? "ON"
                            : "OFF"}
                        </span>
                      </p>

                      <p>
                        Base64:{" "}
                        <span className="font-bold">
                          {servico.evolution_webhook_base64
                            ? "ON"
                            : "OFF"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h4 className="text-lg font-bold">
                      Planos do serviço
                    </h4>

                    <p className="text-gray-400 text-sm">
                      {planosServico.length} plano(s)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {planosServico.map((plano: any) => (
                    <div
                      key={plano.id}
                      className={`rounded-3xl border p-5 relative overflow-hidden ${
                        plano.destaque
                          ? "border-green-500 bg-green-500/10"
                          : "border-zinc-700 bg-zinc-800"
                      }`}
                    >
                      {plano.destaque && (
                        <div className="absolute top-3 right-3 bg-green-500 text-black text-xs font-black px-3 py-1 rounded-full">
                          DESTAQUE
                        </div>
                      )}

                      <div className="mb-4">
                        <h5 className="text-xl font-bold">
                          {plano.nome}
                        </h5>

                        <p className="text-gray-400 text-sm mt-2">
                          {plano.descricao || "Sem descrição"}
                        </p>
                      </div>

                      <div className="mb-5">
                        <p className="text-3xl font-black">
                          {moeda(plano.valor)}
                        </p>

                        <p className="text-gray-400 text-sm mt-1">
                          {plano.meses} mês(es)
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-5">
                        <div className="bg-zinc-900 rounded-xl p-3">
                          <p className="text-gray-400 text-xs mb-1">
                            Ordem
                          </p>

                          <p className="font-bold">
                            {plano.ordem || 0}
                          </p>
                        </div>

                        <div className="bg-zinc-900 rounded-xl p-3">
                          <p className="text-gray-400 text-xs mb-1">
                            Status
                          </p>

                          <p
                            className={`font-bold ${
                              plano.ativo
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {plano.ativo ? "Ativo" : "Inativo"}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => editarPlano(plano)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-2xl font-bold"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => excluirPlano(plano.id)}
                          className="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded-2xl font-bold"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}

                  {planosServico.length === 0 && (
                    <div className="bg-zinc-800 border border-zinc-700 rounded-3xl p-8 text-center text-gray-400">
                      Nenhum plano cadastrado.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {servicosFiltrados.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-10 text-center text-gray-400">
            Nenhum serviço encontrado.
          </div>
        )}
      </div>
    </div>
  );
}