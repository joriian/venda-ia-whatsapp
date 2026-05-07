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

const EVENTOS_EVOLUTION = [
  {
    id: "MESSAGES_UPSERT",
    nome: "Mensagens recebidas",
    descricao: "Use este para IA responder mensagens no WhatsApp.",
    recomendado: true,
  },
  {
    id: "CONNECTION_UPDATE",
    nome: "Status da conexão",
    descricao: "Avisa quando conecta, desconecta ou precisa de QR Code.",
    recomendado: true,
  },
  {
    id: "QRCODE_UPDATED",
    nome: "QR Code atualizado",
    descricao: "Útil para atualizar QR Code no painel do cliente.",
    recomendado: false,
  },
  {
    id: "SEND_MESSAGE",
    nome: "Mensagem enviada",
    descricao: "Avisa quando uma mensagem é enviada pela instância.",
    recomendado: false,
  },
  {
    id: "MESSAGES_UPDATE",
    nome: "Mensagem atualizada",
    descricao: "Avisa mudanças de status de mensagem.",
    recomendado: false,
  },
  {
    id: "CONTACTS_UPDATE",
    nome: "Contato atualizado",
    descricao: "Avisa quando dados de contato mudam.",
    recomendado: false,
  },
  {
    id: "CHATS_UPDATE",
    nome: "Chat atualizado",
    descricao: "Avisa mudanças em conversas/chats.",
    recomendado: false,
  },
];

const TIPOS_WORKFLOW = [
  { id: "frete", nome: "IA Frete" },
  { id: "hotel", nome: "IA Hotelaria" },
  { id: "pagamento", nome: "IA Pagamento" },
  { id: "atendimento", nome: "IA Atendimento" },
  { id: "agendamento", nome: "IA Agendamento" },
  { id: "whatsapp", nome: "WhatsApp geral" },
  { id: "outro", nome: "Outro" },
];

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
  const [modalServicoAberto, setModalServicoAberto] = useState(false);
  const [servicoEditando, setServicoEditando] = useState<any>(null);
  const [modalPlanoAberto, setModalPlanoAberto] = useState(false);
  const [planoEditando, setPlanoEditando] = useState<any>(null);

  const servicosFiltrados = useMemo(() => {
    return (servicos || []).filter((servico: any) => {
      const texto = `
        ${servico.nome || ""}
        ${servico.slug || ""}
        ${servico.descricao || ""}
        ${servico.workflow_tipo || ""}
        ${servico.workflow_id || ""}
        ${servico.webhook_url || ""}
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

  function abrirNovoServico() {
    setServicoEditando(null);
    setModalServicoAberto(true);
  }

  function abrirEditarServico(servico: any) {
    setServicoEditando(servico);
    setModalServicoAberto(true);
  }

  function abrirNovoPlano(servicoId?: string) {
    setPlanoEditando(
      servicoId
        ? {
            servico_id: servicoId,
          }
        : null
    );
    setModalPlanoAberto(true);
  }

  function abrirEditarPlano(plano: any) {
    setPlanoEditando(plano);
    setModalPlanoAberto(true);
  }

  async function salvarServicoModal(dados: any) {
    await salvarServico(dados);
    setModalServicoAberto(false);
    setServicoEditando(null);
  }

  async function salvarPlanoModal(dados: any) {
    await salvarPlano(dados);
    setModalPlanoAberto(false);
    setPlanoEditando(null);
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
        <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Serviços e automações</h2>

            <p className="text-gray-400 text-sm mt-1">
              Gerencie serviços, workflows n8n, webhooks e eventos da Evolution.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={abrirNovoServico}
              className="bg-purple-600 hover:bg-purple-700 px-5 py-3 rounded-2xl font-bold"
            >
              Novo serviço
            </button>

            <button
              onClick={() => abrirNovoPlano()}
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
            placeholder="Pesquisar serviço, workflow, webhook..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3"
          />
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
        <h3 className="text-lg font-bold mb-3">O que são eventos da Evolution?</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <InfoBox
            titulo="MESSAGES_UPSERT"
            texto="Dispara quando chega mensagem nova. É o principal para suas IAs."
          />
          <InfoBox
            titulo="CONNECTION_UPDATE"
            texto="Dispara quando o WhatsApp conecta, desconecta ou muda estado."
          />
          <InfoBox
            titulo="QRCODE_UPDATED"
            texto="Dispara quando o QR Code muda. Útil para painel do cliente."
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
                      <h3 className="text-2xl font-bold">{servico.nome}</h3>

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

                      {servico.webhook_url ? (
                        <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold">
                          WEBHOOK CONFIGURADO
                        </span>
                      ) : (
                        <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold">
                          SEM WEBHOOK
                        </span>
                      )}
                    </div>

                    <p className="text-gray-400 text-sm leading-relaxed">
                      {servico.descricao || "Sem descrição"}
                    </p>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => abrirNovoPlano(servico.id)}
                      className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl font-bold text-sm"
                    >
                      Novo plano
                    </button>

                    <button
                      onClick={() => abrirEditarServico(servico)}
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
                  <InfoBox
                    titulo="Workflow ID"
                    texto={servico.workflow_id || "-"}
                    mono
                  />

                  <InfoBox
                    titulo="Webhook URL"
                    texto={servico.webhook_url || "-"}
                    mono
                  />

                  <InfoBox
                    titulo="Eventos Evolution"
                    texto={
                      Array.isArray(servico.evolution_events) &&
                      servico.evolution_events.length > 0
                        ? servico.evolution_events.join(", ")
                        : "MESSAGES_UPSERT, CONNECTION_UPDATE"
                    }
                  />

                  <div className="bg-zinc-800 rounded-2xl p-4 border border-zinc-700">
                    <p className="text-gray-400 text-xs mb-1">Integração</p>

                    <div className="space-y-1 text-sm">
                      <p>
                        Webhook: <strong>{servico.evolution_webhook_enabled ? "ON" : "OFF"}</strong>
                      </p>

                      <p>
                        Base64: <strong>{servico.evolution_webhook_base64 ? "ON" : "OFF"}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h4 className="text-lg font-bold">Planos do serviço</h4>

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
                        <h5 className="text-xl font-bold">{plano.nome}</h5>

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
                          <p className="text-gray-400 text-xs mb-1">Ordem</p>
                          <p className="font-bold">{plano.ordem || 0}</p>
                        </div>

                        <div className="bg-zinc-900 rounded-xl p-3">
                          <p className="text-gray-400 text-xs mb-1">Status</p>
                          <p
                            className={`font-bold ${
                              plano.ativo ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {plano.ativo ? "Ativo" : "Inativo"}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => abrirEditarPlano(plano)}
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

      {modalServicoAberto && (
        <ModalServico
          servico={servicoEditando}
          fechar={() => setModalServicoAberto(false)}
          salvar={salvarServicoModal}
        />
      )}

      {modalPlanoAberto && (
        <ModalPlano
          plano={planoEditando}
          servicos={servicos}
          fechar={() => setModalPlanoAberto(false)}
          salvar={salvarPlanoModal}
        />
      )}
    </div>
  );
}

function InfoBox({ titulo, texto, mono = false }: any) {
  return (
    <div className="bg-zinc-800 rounded-2xl p-4 border border-zinc-700">
      <p className="text-gray-400 text-xs mb-1">{titulo}</p>
      <p className={`${mono ? "font-mono" : ""} text-sm break-all`}>
        {texto || "-"}
      </p>
    </div>
  );
}

function ModalServico({ servico, fechar, salvar }: any) {
  const [form, setForm] = useState({
    id: servico?.id || null,
    nome: servico?.nome || "",
    slug: servico?.slug || "",
    descricao: servico?.descricao || "",
    ativo: servico?.ativo ?? true,
    ordem: servico?.ordem || 0,
    workflow_id: servico?.workflow_id || "",
    webhook_url: servico?.webhook_url || "",
    workflow_tipo: servico?.workflow_tipo || "frete",
    evolution_webhook_enabled: servico?.evolution_webhook_enabled ?? true,
    evolution_webhook_base64: servico?.evolution_webhook_base64 ?? true,
    evolution_events:
      Array.isArray(servico?.evolution_events) && servico.evolution_events.length > 0
        ? servico.evolution_events
        : ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
  });

  function atualizarCampo(campo: string, valor: any) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function alternarEvento(evento: string) {
    setForm((atual) => {
      const existe = atual.evolution_events.includes(evento);

      return {
        ...atual,
        evolution_events: existe
          ? atual.evolution_events.filter((e: string) => e !== evento)
          : [...atual.evolution_events, evento],
      };
    });
  }

  function preencherRecomendado() {
    setForm((atual) => ({
      ...atual,
      evolution_events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
      evolution_webhook_enabled: true,
      evolution_webhook_base64: true,
    }));
  }

  async function testarWebhook() {
    if (!form.webhook_url) {
      alert("Informe a URL do webhook primeiro.");
      return;
    }

    try {
      const res = await fetch(form.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teste: true,
          origem: "painel_admin",
          mensagem: "Teste enviado pelo painel admin",
          data: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        alert("Webhook respondeu com sucesso.");
      } else {
        alert(`Webhook respondeu com erro: ${res.status}`);
      }
    } catch (error) {
      alert("Não foi possível conectar ao webhook. Verifique a URL.");
    }
  }

  async function submit() {
    if (!form.nome.trim()) {
      alert("Informe o nome do serviço.");
      return;
    }

    if (!form.slug.trim()) {
      alert("Informe o slug do serviço.");
      return;
    }

    await salvar({
      acao: form.id ? "atualizar_servico" : "criar_servico",
      ...form,
      evolution_events: form.evolution_events.map((e: string) => e.toUpperCase()),
    });
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-700 rounded-3xl w-full max-w-5xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              {form.id ? "Editar serviço" : "Novo serviço"}
            </h2>

            <p className="text-gray-400 text-sm mt-1">
              Configure o serviço, o workflow do n8n e os eventos da Evolution.
            </p>
          </div>

          <button
            onClick={fechar}
            className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-2xl font-bold"
          >
            Fechar
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5 space-y-4">
            <h3 className="font-bold text-lg">Dados do serviço</h3>

            <Campo
              label="Nome do serviço"
              value={form.nome}
              onChange={(v: string) => atualizarCampo("nome", v)}
              placeholder="IA Frete"
            />

            <Campo
              label="Slug"
              value={form.slug}
              onChange={(v: string) => atualizarCampo("slug", v)}
              placeholder="ia-frete"
            />

            <div>
              <label className="text-sm text-gray-400 block mb-2">Descrição</label>
              <textarea
                value={form.descricao}
                onChange={(e) => atualizarCampo("descricao", e.target.value)}
                rows={5}
                placeholder="Automação para calcular frete pelo WhatsApp."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Tipo do workflow</label>
                <select
                  value={form.workflow_tipo}
                  onChange={(e) => atualizarCampo("workflow_tipo", e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3"
                >
                  {TIPOS_WORKFLOW.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </option>
                  ))}
                </select>
              </div>

              <Campo
                label="Ordem"
                type="number"
                value={form.ordem}
                onChange={(v: string) => atualizarCampo("ordem", Number(v))}
              />
            </div>

            <label className="flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => atualizarCampo("ativo", e.target.checked)}
              />
              Serviço ativo
            </label>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5 space-y-4">
            <h3 className="font-bold text-lg">Integração n8n + Evolution</h3>

            <Campo
              label="Workflow ID do n8n"
              value={form.workflow_id}
              onChange={(v: string) => atualizarCampo("workflow_id", v)}
              placeholder="Pot66lde8TYkTNhS"
            />

            <Campo
              label="Webhook URL do n8n"
              value={form.webhook_url}
              onChange={(v: string) => atualizarCampo("webhook_url", v)}
              placeholder="https://seu-n8n.com/webhook/CalcFrete"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.evolution_webhook_enabled}
                  onChange={(e) =>
                    atualizarCampo("evolution_webhook_enabled", e.target.checked)
                  }
                />
                Webhook Evolution ativo
              </label>

              <label className="flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.evolution_webhook_base64}
                  onChange={(e) =>
                    atualizarCampo("evolution_webhook_base64", e.target.checked)
                  }
                />
                Base64 ativo
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <label className="text-sm text-gray-400">Eventos da Evolution</label>

                <button
                  type="button"
                  onClick={preencherRecomendado}
                  className="text-xs bg-green-600 hover:bg-green-700 px-3 py-2 rounded-xl font-bold"
                >
                  Usar recomendado
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {EVENTOS_EVOLUTION.map((evento) => (
                  <label
                    key={evento.id}
                    className={`border rounded-2xl p-4 cursor-pointer transition ${
                      form.evolution_events.includes(evento.id)
                        ? "bg-green-500/10 border-green-600"
                        : "bg-zinc-800 border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={form.evolution_events.includes(evento.id)}
                        onChange={() => alternarEvento(evento.id)}
                        className="mt-1"
                      />

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm">{evento.nome}</p>
                          {evento.recomendado && (
                            <span className="bg-green-600 text-white text-[10px] px-2 py-1 rounded-full font-bold">
                              RECOMENDADO
                            </span>
                          )}
                        </div>

                        <p className="font-mono text-xs text-gray-300 mt-1">
                          {evento.id}
                        </p>

                        <p className="text-xs text-gray-400 mt-2">
                          {evento.descricao}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 flex-wrap pt-3">
              <button
                type="button"
                onClick={testarWebhook}
                className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-2xl font-bold"
              >
                Testar webhook
              </button>

              <button
                type="button"
                onClick={submit}
                className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-2xl font-bold"
              >
                Salvar serviço
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalPlano({ plano, servicos, fechar, salvar }: any) {
  const [form, setForm] = useState({
    id: plano?.id || null,
    servico_id: plano?.servico_id || servicos?.[0]?.id || "",
    nome: plano?.nome || "",
    descricao: plano?.descricao || "",
    valor: plano?.valor || "",
    meses: plano?.meses || 1,
    ativo: plano?.ativo ?? true,
    destaque: plano?.destaque ?? false,
    ordem: plano?.ordem || 0,
  });

  function atualizarCampo(campo: string, valor: any) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  async function submit() {
    if (!form.servico_id) {
      alert("Escolha o serviço.");
      return;
    }

    if (!form.nome.trim()) {
      alert("Informe o nome do plano.");
      return;
    }

    if (!form.valor) {
      alert("Informe o valor do plano.");
      return;
    }

    await salvar({
      acao: form.id ? "atualizar_plano" : "criar_plano",
      ...form,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-700 rounded-3xl w-full max-w-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              {form.id ? "Editar plano" : "Novo plano"}
            </h2>

            <p className="text-gray-400 text-sm mt-1">
              Configure preço, duração e destaque do plano.
            </p>
          </div>

          <button
            onClick={fechar}
            className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-2xl font-bold"
          >
            Fechar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 block mb-2">Serviço</label>
            <select
              value={form.servico_id}
              onChange={(e) => atualizarCampo("servico_id", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3"
            >
              {servicos.map((servico: any) => (
                <option key={servico.id} value={servico.id}>
                  {servico.nome}
                </option>
              ))}
            </select>
          </div>

          <Campo
            label="Nome do plano"
            value={form.nome}
            onChange={(v: string) => atualizarCampo("nome", v)}
            placeholder="Plano Mensal"
          />

          <Campo
            label="Valor"
            value={form.valor}
            onChange={(v: string) => atualizarCampo("valor", v)}
            placeholder="4.99"
          />

          <Campo
            label="Meses"
            type="number"
            value={form.meses}
            onChange={(v: string) => atualizarCampo("meses", Number(v))}
          />

          <Campo
            label="Ordem"
            type="number"
            value={form.ordem}
            onChange={(v: string) => atualizarCampo("ordem", Number(v))}
          />

          <div className="grid grid-cols-1 gap-3">
            <label className="flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => atualizarCampo("ativo", e.target.checked)}
              />
              Plano ativo
            </label>

            <label className="flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.destaque}
                onChange={(e) => atualizarCampo("destaque", e.target.checked)}
              />
              Plano em destaque
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-gray-400 block mb-2">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={(e) => atualizarCampo("descricao", e.target.value)}
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={fechar}
            className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-2xl font-bold"
          >
            Cancelar
          </button>

          <button
            onClick={submit}
            className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-2xl font-bold"
          >
            Salvar plano
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, value, onChange, placeholder = "", type = "text" }: any) {
  return (
    <div>
      <label className="text-sm text-gray-400 block mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3"
      />
    </div>
  );
}
