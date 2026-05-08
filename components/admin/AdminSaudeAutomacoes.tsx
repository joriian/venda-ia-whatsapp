"use client";

import { useEffect, useState } from "react";

export default function AdminSaudeAutomacoes({ adminToken }: { adminToken: string }) {
  const [automacoes, setAutomacoes] = useState<any[]>([]);
  const [resumo, setResumo] = useState<any>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarSaude();
  }, [filtro]);

  async function carregarSaude() {
    setCarregando(true);

    try {
      const params = new URLSearchParams();
      params.set("busca", busca);
      params.set("filtro", filtro);

      const res = await fetch(`/api/admin/saude?${params.toString()}`, {
        headers: {
          "x-admin-token": adminToken,
        },
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.detalhe || data.error || "Erro ao carregar saúde das automações.");
        return;
      }

      setResumo(data.resumo || null);
      setAutomacoes(data.automacoes || []);
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar saúde das automações.");
    } finally {
      setCarregando(false);
    }
  }

  function dataHora(data: string) {
    if (!data) return "-";
    return new Date(data).toLocaleString("pt-BR");
  }

  function statusConectado(status: string) {
    const s = String(status || "").toLowerCase();
    return s === "open" || s === "connected" || s === "conectado";
  }

  return (
    <section className="space-y-5">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Saúde das automações</h2>
            <p className="text-gray-400 text-sm mt-1">
              Monitore instâncias, mensagens, erros e envio para o n8n.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full xl:w-auto">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente, serviço, instância..."
              className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700 min-w-[280px]"
            />

            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700"
            >
              <option value="todos">Todas</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="erro">Com erro hoje</option>
              <option value="sem_evento">Sem evento</option>
            </select>

            <button
              onClick={carregarSaude}
              className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-2xl font-bold"
            >
              {carregando ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>
      </div>

      {resumo && (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card titulo="Total" valor={resumo.total} />
          <Card titulo="Online" valor={resumo.online} destaque="verde" />
          <Card titulo="Offline" valor={resumo.offline} destaque="vermelho" />
          <Card titulo="Com erro hoje" valor={resumo.com_erro_hoje} destaque="amarelo" />
          <Card titulo="Sem evento" valor={resumo.sem_evento} />
          <Card titulo="Mensagens hoje" valor={resumo.mensagens_hoje} />
        </div>
      )}

      <div className="grid gap-4">
        {automacoes.map((item) => {
          const online = statusConectado(item.instance_status);

          return (
            <div
              key={item.id}
              className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5"
            >
              <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full border text-xs font-bold ${
                        online
                          ? "bg-green-900/40 text-green-400 border-green-700"
                          : "bg-red-900/40 text-red-400 border-red-700"
                      }`}
                    >
                      {online ? "ONLINE" : "OFFLINE"}
                    </span>

                    {Number(item.erros_hoje || 0) > 0 && (
                      <span className="px-3 py-1 rounded-full border text-xs font-bold bg-yellow-900/40 text-yellow-400 border-yellow-700">
                        {item.erros_hoje} ERRO(S) HOJE
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold break-all">
                    {item.servico_nome || "Serviço"} — {item.cliente_nome || "Cliente"}
                  </h3>

                  <p className="text-gray-400 text-sm mt-1 break-all">
                    {item.instance_name}
                  </p>
                </div>

                <div className="text-sm text-gray-400 xl:text-right">
                  <p>
                    Status:{" "}
                    <span className="text-white font-bold">
                      {item.instance_status || "-"}
                    </span>
                  </p>
                  <p>
                    Serviço:{" "}
                    <span className="text-white font-bold">
                      {item.servico_status || "-"}
                    </span>
                  </p>
                  <p>
                    Número:{" "}
                    <span className="text-white font-bold">
                      {item.numero || "-"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
                <Info label="Cliente" value={item.cliente_nome || "-"} />
                <Info label="Email" value={item.cliente_email || "-"} />
                <Info label="Telefone" value={item.cliente_telefone || "-"} />
                <Info label="Vencimento" value={item.data_expiracao ? new Date(item.data_expiracao).toLocaleDateString("pt-BR") : "-"} />
                <Info label="Workflow" value={item.workflow_id || "-"} />
                <Info label="Webhook" value={item.webhook_url || "-"} />
                <Info label="Último evento" value={dataHora(item.ultimo_evento_em)} />
                <Info label="Último envio n8n" value={dataHora(item.ultimo_envio_n8n_em)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Info label="Mensagens hoje" value={item.mensagens_hoje || 0} />
                <Info label="Erros hoje" value={item.erros_hoje || 0} />
                <Info label="Último erro" value={item.ultimo_erro_n8n || "-"} />
              </div>
            </div>
          );
        })}

        {automacoes.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-10 text-center text-gray-400">
            Nenhuma automação encontrada.
          </div>
        )}
      </div>
    </section>
  );
}

function Card({ titulo, valor, destaque }: any) {
  const cor =
    destaque === "verde"
      ? "text-green-400"
      : destaque === "vermelho"
      ? "text-red-400"
      : destaque === "amarelo"
      ? "text-yellow-400"
      : "text-white";

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
      <p className="text-gray-400 text-sm">{titulo}</p>
      <p className={`text-3xl font-black mt-2 ${cor}`}>{valor}</p>
    </div>
  );
}

function Info({ label, value }: any) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="font-bold break-all text-sm">{value || "-"}</p>
    </div>
  );
}