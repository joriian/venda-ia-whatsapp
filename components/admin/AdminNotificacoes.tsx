"use client";

import { useEffect, useMemo, useState } from "react";

export default function AdminNotificacoes({ adminToken }: { adminToken: string }) {
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("abertas");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarNotificacoes();

    const interval = setInterval(() => {
      carregarNotificacoes();
    }, 15000);

    return () => clearInterval(interval);
  }, [filtroNivel, filtroStatus]);

  async function carregarNotificacoes() {
    setCarregando(true);

    try {
      const params = new URLSearchParams();
      params.set("busca", busca);
      params.set("nivel", filtroNivel);
      params.set("status", filtroStatus);

      const res = await fetch(`/api/admin/notificacoes?${params.toString()}`, {
        headers: {
          "x-admin-token": adminToken,
        },
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.detalhe || data.error || "Erro ao carregar notificações.");
        return;
      }

      setNotificacoes(data.notificacoes || []);
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar notificações.");
    } finally {
      setCarregando(false);
    }
  }

  async function resolverNotificacao(id: string) {
    const confirmar = confirm("Marcar esta notificação como resolvida?");
    if (!confirmar) return;

    try {
      const res = await fetch("/api/admin/notificacoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          acao: "resolver",
          id,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.detalhe || data.error || "Erro ao resolver notificação.");
        return;
      }

      await carregarNotificacoes();
    } catch (error) {
      console.error(error);
      alert("Erro ao resolver notificação.");
    }
  }

  async function marcarLida(id: string) {
    try {
      const res = await fetch("/api/admin/notificacoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          acao: "lida",
          id,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.detalhe || data.error || "Erro ao marcar como lida.");
        return;
      }

      await carregarNotificacoes();
    } catch (error) {
      console.error(error);
      alert("Erro ao marcar como lida.");
    }
  }

  function dataHora(data: string) {
    if (!data) return "-";
    return new Date(data).toLocaleString("pt-BR");
  }

  const resumo = useMemo(() => {
    return {
      total: notificacoes.length,
      criticas: notificacoes.filter((n) => n.nivel === "error").length,
      alertas: notificacoes.filter((n) => n.nivel === "warning").length,
      sucesso: notificacoes.filter((n) => n.nivel === "success").length,
      naoLidas: notificacoes.filter((n) => !n.lida).length,
    };
  }, [notificacoes]);

  return (
    <section className="space-y-5">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Central de notificações</h2>
            <p className="text-gray-400 text-sm mt-1">
              Acompanhe pagamentos, vencimentos, erros do n8n e instâncias desconectadas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full xl:w-auto">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente, mensagem, tipo..."
              className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700 min-w-[260px]"
            />

            <select
              value={filtroNivel}
              onChange={(e) => setFiltroNivel(e.target.value)}
              className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700"
            >
              <option value="todos">Todos os níveis</option>
              <option value="error">Críticas</option>
              <option value="warning">Alertas</option>
              <option value="success">Sucesso</option>
              <option value="info">Informação</option>
            </select>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700"
            >
              <option value="abertas">Abertas</option>
              <option value="resolvidas">Resolvidas</option>
              <option value="todas">Todas</option>
            </select>

            <button
              onClick={carregarNotificacoes}
              className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-2xl font-bold"
            >
              {carregando ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <ResumoCard titulo="Total" valor={resumo.total} />
        <ResumoCard titulo="Críticas" valor={resumo.criticas} cor="vermelho" />
        <ResumoCard titulo="Alertas" valor={resumo.alertas} cor="amarelo" />
        <ResumoCard titulo="Sucesso" valor={resumo.sucesso} cor="verde" />
        <ResumoCard titulo="Não lidas" valor={resumo.naoLidas} cor="azul" />
      </div>

      <div className="grid gap-4">
        {notificacoes.map((n) => (
          <div
            key={n.id}
            className={`bg-zinc-900 border rounded-3xl p-5 ${
              n.nivel === "error"
                ? "border-red-800"
                : n.nivel === "warning"
                ? "border-yellow-800"
                : n.nivel === "success"
                ? "border-green-800"
                : "border-zinc-700"
            }`}
          >
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <BadgeNivel nivel={n.nivel} />

                  <span className="bg-zinc-800 border border-zinc-700 px-3 py-1 rounded-full text-xs font-bold text-gray-300">
                    {n.tipo || "-"}
                  </span>

                  {!n.lida && (
                    <span className="bg-blue-900/40 border border-blue-700 px-3 py-1 rounded-full text-xs font-bold text-blue-400">
                      NOVA
                    </span>
                  )}

                  {n.resolved && (
                    <span className="bg-green-900/40 border border-green-700 px-3 py-1 rounded-full text-xs font-bold text-green-400">
                      RESOLVIDA
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold">{n.titulo}</h3>

                <p className="text-gray-300 text-sm mt-3 whitespace-pre-wrap break-words">
                  {n.mensagem}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <Info label="Cliente" value={n.clientes_ia_whatsapp?.nome || "-"} />
                  <Info label="Email" value={n.clientes_ia_whatsapp?.email || "-"} />
                  <Info label="Data" value={dataHora(n.created_at)} />
                </div>

                {n.resolved && (
                  <p className="text-gray-500 text-xs mt-3">
                    Resolvida em {dataHora(n.resolved_at)} por {n.resolved_by || "-"}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 min-w-[180px]">
                {!n.lida && (
                  <button
                    onClick={() => marcarLida(n.id)}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl font-bold text-sm"
                  >
                    Marcar lida
                  </button>
                )}

                {!n.resolved && (
                  <button
                    onClick={() => resolverNotificacao(n.id)}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl font-bold text-sm"
                  >
                    Resolver
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {notificacoes.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-10 text-center text-gray-400">
            Nenhuma notificação encontrada.
          </div>
        )}
      </div>
    </section>
  );
}

function ResumoCard({ titulo, valor, cor }: any) {
  const classe =
    cor === "vermelho"
      ? "text-red-400"
      : cor === "amarelo"
      ? "text-yellow-400"
      : cor === "verde"
      ? "text-green-400"
      : cor === "azul"
      ? "text-blue-400"
      : "text-white";

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
      <p className="text-gray-400 text-sm">{titulo}</p>
      <p className={`text-3xl font-black mt-2 ${classe}`}>{valor}</p>
    </div>
  );
}

function BadgeNivel({ nivel }: any) {
  const config: any = {
    error: "bg-red-900/40 text-red-400 border-red-700 CRÍTICA",
    warning: "bg-yellow-900/40 text-yellow-400 border-yellow-700 ALERTA",
    success: "bg-green-900/40 text-green-400 border-green-700 SUCESSO",
    info: "bg-blue-900/40 text-blue-400 border-blue-700 INFO",
  };

  const texto = config[nivel] || config.info;
  const partes = texto.split(" ");
  const label = partes.pop();
  const classe = partes.join(" ");

  return (
    <span className={`px-3 py-1 rounded-full border text-xs font-bold ${classe}`}>
      {label}
    </span>
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