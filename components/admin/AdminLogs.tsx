"use client";

import { useEffect, useState } from "react";

export default function AdminLogs({ adminToken }: { adminToken: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarLogs();
  }, [status]);

  async function carregarLogs() {
    setCarregando(true);

    try {
      const params = new URLSearchParams();
      params.set("busca", busca);
      params.set("status", status);

      const res = await fetch(`/api/admin/logs?${params.toString()}`, {
        headers: {
          "x-admin-token": adminToken,
        },
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.detalhe || data.error || "Erro ao buscar logs.");
        return;
      }

      setLogs(data.logs || []);
    } finally {
      setCarregando(false);
    }
  }

  function dataPt(data: string) {
    if (!data) return "-";
    return new Date(data).toLocaleString("pt-BR");
  }

  return (
    <section className="space-y-5">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Logs de mensagens</h2>
            <p className="text-gray-400 text-sm mt-1">
              Veja se as mensagens chegaram da Evolution e se foram enviadas ao n8n.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full xl:w-auto">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar instância, mensagem, remetente..."
              className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700 min-w-[280px]"
            />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700"
            >
              <option value="todos">Todos</option>
              <option value="enviado">Enviado ao n8n</option>
              <option value="erro">Com erro</option>
            </select>

            <button
              onClick={carregarLogs}
              className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-2xl font-bold"
            >
              {carregando ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {logs.map((log) => (
          <div
            key={log.id}
            className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5"
          >
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-4">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      log.enviado_n8n
                        ? "bg-green-900/40 text-green-400 border-green-700"
                        : "bg-red-900/40 text-red-400 border-red-700"
                    }`}
                  >
                    {log.enviado_n8n ? "ENVIADO AO N8N" : "NÃO ENVIADO"}
                  </span>

                  <span className="bg-zinc-800 px-3 py-1 rounded-full text-xs font-bold text-gray-300">
                    {log.evento || "-"}
                  </span>
                </div>

                <h3 className="text-lg font-bold break-all">
                  {log.instance_name || "Instância não identificada"}
                </h3>

                <p className="text-gray-400 text-sm mt-1">
                  {dataPt(log.criado_em)}
                </p>
              </div>

              <div className="text-sm text-gray-400 xl:text-right">
                <p>
                  Cliente:{" "}
                  <span className="text-white font-bold">
                    {log.clientes_ia_whatsapp?.nome || "-"}
                  </span>
                </p>
                <p>
                  Serviço:{" "}
                  <span className="text-white font-bold">
                    {log.servicos_ia?.nome || "-"}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mb-4">
              <Info label="Remetente" value={log.remetente || "-"} />
              <Info label="Nome remetente" value={log.nome_remetente || "-"} />
              <Info label="Erro n8n" value={log.erro_n8n || "-"} />
            </div>

            <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4">
              <p className="text-gray-400 text-xs mb-2">Mensagem</p>
              <p className="text-sm whitespace-pre-wrap break-words">
                {log.mensagem || "Sem texto capturado."}
              </p>
            </div>
          </div>
        ))}

        {logs.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-10 text-center text-gray-400">
            Nenhum log encontrado.
          </div>
        )}
      </div>
    </section>
  );
}

function Info({ label, value }: any) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="font-bold break-all text-sm">{value}</p>
    </div>
  );
}