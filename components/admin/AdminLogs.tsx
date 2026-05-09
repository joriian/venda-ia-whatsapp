"use client";

import { useEffect, useState } from "react";

export default function AdminLogs({
  adminToken,
}: {
  adminToken: string;
}) {
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

      const res = await fetch(
        `/api/admin/logs?${params.toString()}`,
        {
          headers: {
            "x-admin-token": adminToken,
          },
        }
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(
          data.detalhe ||
            data.error ||
            "Erro ao buscar logs."
        );

        return;
      }

      setLogs(data.logs || []);
    } finally {
      setCarregando(false);
    }
  }

  function dataPt(data: string) {
    if (!data) return "-";

    return new Date(data).toLocaleString(
      "pt-BR"
    );
  }

  return (
    <section className="space-y-6">
      <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
          <div>
            <h2 className="text-3xl font-black">
              Logs do sistema
            </h2>

            <p className="text-gray-500 text-sm mt-2">
              Logs da Evolution, mensagens,
              n8n e auditoria do painel admin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full xl:w-auto">
            <input
              value={busca}
              onChange={(e) =>
                setBusca(e.target.value)
              }
              placeholder="Buscar instância, mensagem, remetente..."
              className="
                bg-[#131313]
                border
                border-white/10
                rounded-2xl
                px-5
                py-4
                min-w-[280px]
                outline-none
                focus:border-green-500
                transition-all
              "
            />

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
              className="
                bg-[#131313]
                border
                border-white/10
                rounded-2xl
                px-5
                py-4
                outline-none
              "
            >
              <option value="todos">
                Todos
              </option>

              <option value="enviado">
                Enviado ao n8n
              </option>

              <option value="erro">
                Com erro
              </option>
            </select>

            <button
              onClick={carregarLogs}
              className="
                bg-green-500/20
                text-green-400
                hover:bg-green-500/30
                rounded-2xl
                px-5
                py-4
                font-bold
                transition-all
              "
            >
              {carregando
                ? "Buscando..."
                : "Buscar"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5">
        {logs.map((log) => (
          <div
            key={log.id}
            className="
              bg-[#0D0D0D]
              border
              border-white/10
              rounded-3xl
              overflow-hidden
            "
          >
            <div className="p-6 border-b border-white/5">
              <div className="flex flex-col 2xl:flex-row gap-5 2xl:items-start 2xl:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <StatusBadge
                      enviado={
                        log.enviado_n8n
                      }
                    />

                    <EventoBadge
                      evento={log.evento}
                    />
                  </div>

                  <h3 className="text-2xl font-black break-all">
                    {log.instance_name ||
                      "Instância não identificada"}
                  </h3>

                  <p className="text-gray-500 text-sm mt-2">
                    {dataPt(log.criado_em)}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-[320px]">
                  <MiniInfo
                    titulo="Cliente"
                    valor={
                      log
                        .clientes_ia_whatsapp
                        ?.nome || "-"
                    }
                  />

                  <MiniInfo
                    titulo="Serviço"
                    valor={
                      log.servicos_ia
                        ?.nome || "-"
                    }
                  />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <InfoCard
                  label="Remetente"
                  value={
                    log.remetente || "-"
                  }
                />

                <InfoCard
                  label="Nome remetente"
                  value={
                    log.nome_remetente ||
                    "-"
                  }
                />

                <InfoCard
                  label="Erro n8n"
                  value={
                    log.erro_n8n || "-"
                  }
                  danger={
                    !!log.erro_n8n
                  }
                />
              </div>

              <div className="bg-[#131313] border border-white/10 rounded-3xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-500 text-sm">
                    Mensagem recebida
                  </p>

                  <div className="bg-white/5 px-3 py-1 rounded-full text-xs text-gray-400">
                    LOG
                  </div>
                </div>

                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                  {log.mensagem ||
                    "Sem texto capturado."}
                </p>
              </div>
            </div>
          </div>
        ))}

        {logs.length === 0 && (
          <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-12 text-center">
            <p className="text-gray-500">
              Nenhum log encontrado.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function StatusBadge({
  enviado,
}: {
  enviado: boolean;
}) {
  return (
    <div
      className={`
        px-4
        py-2
        rounded-full
        text-xs
        font-black
        ${
          enviado
            ? "bg-green-500/20 text-green-400"
            : "bg-red-500/20 text-red-400"
        }
      `}
    >
      {enviado
        ? "ENVIADO AO N8N"
        : "NÃO ENVIADO"}
    </div>
  );
}

function EventoBadge({
  evento,
}: {
  evento: string;
}) {
  return (
    <div
      className="
        bg-blue-500/20
        text-blue-400
        px-4
        py-2
        rounded-full
        text-xs
        font-black
      "
    >
      {evento || "-"}
    </div>
  );
}

function MiniInfo({
  titulo,
  valor,
}: any) {
  return (
    <div className="bg-[#131313] border border-white/10 rounded-2xl p-4">
      <p className="text-xs text-gray-500 mb-1">
        {titulo}
      </p>

      <p className="font-bold text-sm break-all">
        {valor}
      </p>
    </div>
  );
}

function InfoCard({
  label,
  value,
  danger = false,
}: any) {
  return (
    <div
      className={`
        rounded-2xl
        p-4
        border
        ${
          danger
            ? "bg-red-500/10 border-red-500/20"
            : "bg-[#131313] border-white/10"
        }
      `}
    >
      <p className="text-xs text-gray-500 mb-1">
        {label}
      </p>

      <p
        className={`
          text-sm
          font-bold
          break-all
          ${
            danger
              ? "text-red-400"
              : ""
          }
        `}
      >
        {value}
      </p>
    </div>
  );
}