"use client";

export default function ClienteCard({
  cliente,
  loading,
  acaoCliente,
}: any) {
  return (
    <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
      <div className="flex flex-col 2xl:flex-row gap-6 2xl:items-start 2xl:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-2xl font-black">
              {cliente.nome || "Cliente"}
            </h3>

            <StatusCliente status={cliente.status} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
            <InfoCliente
              label="Email"
              value={cliente.email || "-"}
            />

            <InfoCliente
              label="Telefone"
              value={cliente.telefone || "-"}
            />

            <InfoCliente
              label="Expiração"
              value={
                cliente.data_expiracao
                  ? new Date(
                      cliente.data_expiracao
                    ).toLocaleDateString("pt-BR")
                  : "-"
              }
            />
          </div>

          <div className="flex flex-wrap gap-3 mt-5">
            {(cliente.servicos_cliente || []).map(
              (servico: any, index: number) => (
                <div
                  key={index}
                  className="bg-[#131313] border border-white/5 rounded-xl px-4 py-3"
                >
                  <p className="text-xs text-gray-500">
                    Serviço
                  </p>

                  <p className="font-bold mt-1">
                    {servico?.servicos_ia?.nome ||
                      "Serviço"}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    {servico?.planos?.nome ||
                      "Plano"}
                  </p>
                </div>
              )
            )}
          </div>

          <div className="mt-5">
            <p className="text-sm text-gray-500 mb-2">
              Últimos pagamentos
            </p>

            <div className="flex flex-wrap gap-2">
              {(cliente.pagamentos_cliente || [])
                .slice(0, 3)
                .map((pagamento: any) => (
                  <PagamentoBadge
                    key={pagamento.id}
                    pagamento={pagamento}
                  />
                ))}

              {(!cliente.pagamentos_cliente ||
                cliente.pagamentos_cliente
                  .length === 0) && (
                <span className="text-gray-600 text-sm">
                  Sem pagamentos recentes.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 2xl:max-w-[430px]">
          <AcaoClienteBtn
            texto="Abrir painel"
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
            texto="Copiar link"
            cor="blue"
            loading={loading}
            onClick={() =>
              acaoCliente(
                cliente.id,
                "gerar_link"
              )
            }
          />

          {cliente.status === "ativo" ? (
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

    bloqueado:
      "bg-red-500/20 text-red-400",

    suspenso:
      "bg-orange-500/20 text-orange-400",

    aguardando_pagamento:
      "bg-yellow-500/20 text-yellow-400",
  };

  const nomes: any = {
    ativo: "ATIVO",
    vencido: "VENCIDO",
    bloqueado: "BLOQUEADO",
    suspenso: "SUSPENSO",
    aguardando_pagamento:
      "AGUARDANDO PAGAMENTO",
  };

  return (
    <div
      className={`px-4 py-2 rounded-full text-sm font-bold ${
        estilos[status] ||
        "bg-white/10 text-white"
      }`}
    >
      {nomes[status] || status}
    </div>
  );
}

function PagamentoBadge({
  pagamento,
}: any) {
  const status =
    String(
      pagamento.status || ""
    ).toLowerCase();

  const traduzido: any = {
    approved: "APROVADO",
    pending: "PENDENTE",
    rejected: "RECUSADO",
    cancelled: "CANCELADO",
    refunded: "REEMBOLSADO",
    chargeback: "CHARGEBACK",
  };

  const cores: any = {
    approved:
      "bg-green-500/20 text-green-400 border-green-500/20",

    pending:
      "bg-yellow-500/20 text-yellow-400 border-yellow-500/20",

    rejected:
      "bg-red-500/20 text-red-400 border-red-500/20",

    cancelled:
      "bg-red-500/20 text-red-400 border-red-500/20",

    refunded:
      "bg-blue-500/20 text-blue-400 border-blue-500/20",

    chargeback:
      "bg-purple-500/20 text-purple-400 border-purple-500/20",
  };

  return (
    <span
      className={`border rounded-full px-3 py-1 text-xs font-semibold ${
        cores[status] ||
        "bg-white/5 border-white/10 text-gray-300"
      }`}
    >
      {traduzido[status] || status}
      {" · "}
      R${" "}
      {Number(
        pagamento.valor || 0
      ).toFixed(2)}
    </span>
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