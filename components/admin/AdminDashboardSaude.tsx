"use client";

import { useEffect, useMemo, useState } from "react";

export default function AdminDashboardSaude({ adminToken }: { adminToken: string }) {
  const [dados, setDados] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregar();

    const interval = setInterval(() => {
      carregar();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  async function carregar() {
    setCarregando(true);

    try {
      const res = await fetch("/api/admin/dashboard-saude", {
        headers: {
          "x-admin-token": adminToken,
        },
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.detalhe || data.error || "Erro ao carregar dashboard de saúde.");
        return;
      }

      setDados(data);
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar dashboard de saúde.");
    } finally {
      setCarregando(false);
    }
  }

  function dataHora(data: string) {
    if (!data) return "-";
    return new Date(data).toLocaleString("pt-BR");
  }

  function online(status: string) {
    const s = String(status || "").toLowerCase();
    return ["open", "connected", "conectado"].includes(s);
  }

  const resumo = dados?.resumo || {};
  const totalInstancias =
    Number(resumo.instancias_online || 0) + Number(resumo.instancias_offline || 0);

  const uptimeInstancias = totalInstancias
    ? Math.round((Number(resumo.instancias_online || 0) / totalInstancias) * 100)
    : 0;

  const totalChecks =
    Number(resumo.webhooks_online || 0) + Number(resumo.webhooks_falha || 0);

  const uptimeWebhooks = totalChecks
    ? Math.round((Number(resumo.webhooks_online || 0) / totalChecks) * 100)
    : 0;

  const statusGeral = useMemo(() => {
    if (Number(resumo.erros_criticos || 0) > 0) return "crítico";
    if (Number(resumo.alertas_abertos || 0) > 0) return "atenção";
    if (uptimeInstancias < 80 || uptimeWebhooks < 80) return "atenção";
    return "saudável";
  }, [resumo, uptimeInstancias, uptimeWebhooks]);

  return (
    <section className="space-y-5">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <p className="text-green-400 text-sm font-bold uppercase tracking-wider">
              Monitoramento operacional
            </p>
            <h2 className="text-3xl font-black mt-1">Dashboard de saúde</h2>
            <p className="text-gray-400 text-sm mt-2">
              Visão geral de Evolution, n8n, webhooks, instâncias e alertas críticos.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <StatusGeral status={statusGeral} />
            <button
              onClick={carregar}
              className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-2xl font-bold"
            >
              {carregando ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card titulo="Uptime instâncias" valor={`${uptimeInstancias}%`} texto={`${resumo.instancias_online || 0} online / ${totalInstancias} total`} tipo={uptimeInstancias >= 80 ? "success" : "error"} />
        <Card titulo="Uptime webhooks" valor={`${uptimeWebhooks}%`} texto={`${resumo.webhooks_online || 0} ok / ${totalChecks} checks`} tipo={uptimeWebhooks >= 80 ? "success" : "warning"} />
        <Card titulo="Tempo médio n8n" valor={`${resumo.tempo_medio_ms || 0}ms`} texto="Média dos checks de webhook" />
        <Card titulo="Alertas críticos" valor={resumo.erros_criticos || 0} texto={`${resumo.alertas_abertos || 0} alertas abertos`} tipo={Number(resumo.erros_criticos || 0) > 0 ? "error" : "success"} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-xl font-bold">Últimos checks de webhooks</h3>
              <p className="text-gray-400 text-sm">Monitoramento recente dos workflows n8n.</p>
            </div>
          </div>

          <div className="grid gap-3">
            {(dados?.ultimosChecks || []).map((check: any) => (
              <div key={check.id} className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge ok={check.status === "online"} texto={check.status === "online" ? "ONLINE" : "FALHA"} />
                      <span className="bg-zinc-900 border border-zinc-700 px-3 py-1 rounded-full text-xs text-gray-300 font-bold">
                        {check.http_status || "-"}
                      </span>
                      <span className="bg-zinc-900 border border-zinc-700 px-3 py-1 rounded-full text-xs text-gray-300 font-bold">
                        {check.tempo_ms || 0}ms
                      </span>
                    </div>

                    <p className="font-bold break-all text-sm">
                      {check.webhook_url || "-"}
                    </p>

                    <p className="text-gray-400 text-xs mt-1">
                      {dataHora(check.criado_em)}
                    </p>
                  </div>

                  {check.erro && (
                    <p className="text-red-400 text-xs max-w-xl break-words">
                      {check.erro}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {(!dados?.ultimosChecks || dados.ultimosChecks.length === 0) && (
              <Vazio texto="Nenhum check encontrado." />
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
          <h3 className="text-xl font-bold mb-1">Alertas críticos</h3>
          <p className="text-gray-400 text-sm mb-4">Erros e avisos ainda não resolvidos.</p>

          <div className="grid gap-3">
            {(dados?.alertasCriticos || []).map((alerta: any) => (
              <div
                key={alerta.id}
                className={`border rounded-2xl p-4 ${
                  alerta.nivel === "error"
                    ? "bg-red-950/20 border-red-800"
                    : "bg-yellow-950/20 border-yellow-800"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      alerta.nivel === "error"
                        ? "bg-red-900/40 text-red-400 border-red-700"
                        : "bg-yellow-900/40 text-yellow-400 border-yellow-700"
                    }`}
                  >
                    {alerta.nivel === "error" ? "CRÍTICO" : "ALERTA"}
                  </span>
                  <span className="text-gray-400 text-xs">{alerta.tipo}</span>
                </div>

                <p className="font-bold text-sm">{alerta.titulo}</p>
                <p className="text-gray-300 text-xs mt-2 whitespace-pre-wrap break-words">
                  {alerta.mensagem}
                </p>
                <p className="text-gray-500 text-xs mt-2">{dataHora(alerta.created_at)}</p>
              </div>
            ))}

            {(!dados?.alertasCriticos || dados.alertasCriticos.length === 0) && (
              <Vazio texto="Nenhum alerta crítico aberto." />
            )}
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
        <h3 className="text-xl font-bold mb-1">Status das instâncias</h3>
        <p className="text-gray-400 text-sm mb-4">Último status conhecido da Evolution.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(dados?.instancias || []).map((instancia: any) => (
            <div key={instancia.id} className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-bold break-all">{instancia.instance_name || "-"}</p>
                  <p className="text-gray-400 text-xs mt-1">
                    {instancia.servico_nome || "Serviço"}
                  </p>
                </div>

                <Badge ok={online(instancia.status)} texto={online(instancia.status) ? "ONLINE" : "OFFLINE"} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Info label="Status" value={instancia.status || "-"} />
                <Info label="Workflow" value={instancia.workflow_id || "-"} />
                <Info label="Atualizado" value={dataHora(instancia.updated_at)} />
                <Info label="Cliente" value={instancia.cliente_id || "-"} />
              </div>
            </div>
          ))}

          {(!dados?.instancias || dados.instancias.length === 0) && (
            <Vazio texto="Nenhuma instância encontrada." />
          )}
        </div>
      </div>
    </section>
  );
}

function StatusGeral({ status }: any) {
  const config: any = {
    saudável: "bg-green-900/40 text-green-400 border-green-700 SAUDÁVEL",
    atenção: "bg-yellow-900/40 text-yellow-400 border-yellow-700 ATENÇÃO",
    crítico: "bg-red-900/40 text-red-400 border-red-700 CRÍTICO",
  };

  const texto = config[status] || config["atenção"];
  const partes = texto.split(" ");
  const label = partes.pop();
  const classe = partes.join(" ");

  return (
    <div className={`px-5 py-3 rounded-2xl border font-black ${classe}`}>
      STATUS: {label}
    </div>
  );
}

function Card({ titulo, valor, texto, tipo }: any) {
  const cor =
    tipo === "success"
      ? "text-green-400"
      : tipo === "warning"
      ? "text-yellow-400"
      : tipo === "error"
      ? "text-red-400"
      : "text-white";

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
      <p className="text-gray-400 text-sm">{titulo}</p>
      <p className={`text-3xl font-black mt-2 ${cor}`}>{valor}</p>
      <p className="text-gray-500 text-xs mt-2">{texto}</p>
    </div>
  );
}

function Badge({ ok, texto }: any) {
  return (
    <span
      className={`px-3 py-1 rounded-full border text-xs font-bold ${
        ok
          ? "bg-green-900/40 text-green-400 border-green-700"
          : "bg-red-900/40 text-red-400 border-red-700"
      }`}
    >
      {texto}
    </span>
  );
}

function Info({ label, value }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-white font-bold break-all">{value || "-"}</p>
    </div>
  );
}

function Vazio({ texto }: any) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-5 text-center text-gray-400">
      {texto}
    </div>
  );
}