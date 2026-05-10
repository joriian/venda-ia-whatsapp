"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type FinanceiroData = {
  faturamento_total: number;
  faturamento_mes: number;
  mrr: number;
  clientes_ativos: number;
  clientes_bloqueados: number;
  upgrades: number;
  renovacoes: number;
  ticket_medio: number;
  pagamentos: any[];
};

function formatarMoeda(valor: number) {
  return Number(valor || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function formatarData(data: string) {
  if (!data) return "-";

  return new Date(data).toLocaleString(
    "pt-BR"
  );
}

function Card({
  titulo,
  valor,
  descricao,
}: {
  titulo: string;
  valor: string;
  descricao?: string;
}) {
  return (
    <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
      <div className="text-sm text-zinc-400">
        {titulo}
      </div>

      <div className="text-3xl font-bold mt-3 text-white">
        {valor}
      </div>

      {descricao && (
        <div className="text-xs text-zinc-500 mt-2">
          {descricao}
        </div>
      )}
    </div>
  );
}

export default function AdminFinanceiroPage() {
  const [dados, setDados] =
    useState<FinanceiroData | null>(
      null
    );

  const [carregando, setCarregando] =
    useState(true);

  async function carregar() {
    try {
      const token =
        localStorage.getItem(
          "adminToken"
        ) || "";

      const res = await fetch(
        "/api/admin/financeiro",
        {
          headers: {
            "x-admin-token": token,
          },
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(
          data.error ||
            "Erro ao carregar financeiro."
        );

        return;
      }

      setDados(data);
    } catch (error) {
      console.log(error);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const pagamentos = useMemo(() => {
    return dados?.pagamentos || [];
  }, [dados]);

  if (carregando) {
    return (
      <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="animate-pulse text-xl">
          Carregando financeiro...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 lg:p-10">
      <div className="mb-10">
        <h1 className="text-4xl font-bold">
          Financeiro
        </h1>

        <p className="text-zinc-400 mt-2">
          Gestão financeira da plataforma.
        </p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        <Card
          titulo="Faturamento Total"
          valor={formatarMoeda(
            dados?.faturamento_total || 0
          )}
        />

        <Card
          titulo="Faturamento do Mês"
          valor={formatarMoeda(
            dados?.faturamento_mes || 0
          )}
        />

        <Card
          titulo="MRR"
          valor={formatarMoeda(
            dados?.mrr || 0
          )}
          descricao="Receita recorrente mensal"
        />

        <Card
          titulo="Ticket Médio"
          valor={formatarMoeda(
            dados?.ticket_medio || 0
          )}
        />

        <Card
          titulo="Clientes Ativos"
          valor={String(
            dados?.clientes_ativos || 0
          )}
        />

        <Card
          titulo="Clientes Bloqueados"
          valor={String(
            dados?.clientes_bloqueados || 0
          )}
        />

        <Card
          titulo="Renovações"
          valor={String(
            dados?.renovacoes || 0
          )}
        />

        <Card
          titulo="Upgrades"
          valor={String(
            dados?.upgrades || 0
          )}
        />
      </section>

      <section className="bg-[#0D0D0D] border border-white/10 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold">
            Últimos pagamentos
          </h2>
        </div>

        <div className="overflow-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-white/5">
              <tr className="text-left text-sm text-zinc-400">
                <th className="p-4">
                  Cliente
                </th>

                <th className="p-4">
                  Serviço
                </th>

                <th className="p-4">
                  Plano
                </th>

                <th className="p-4">
                  Tipo
                </th>

                <th className="p-4">
                  Valor
                </th>

                <th className="p-4">
                  Status
                </th>

                <th className="p-4">
                  Data
                </th>
              </tr>
            </thead>

            <tbody>
              {pagamentos.map(
                (item, index) => (
                  <tr
                    key={index}
                    className="border-t border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="p-4">
                      {item.cliente_nome ||
                        "-"}
                    </td>

                    <td className="p-4">
                      {item.servico_nome ||
                        "-"}
                    </td>

                    <td className="p-4">
                      {item.plano_nome ||
                        "-"}
                    </td>

                    <td className="p-4">
                      <span className="capitalize">
                        {String(
                          item.tipo_movimento ||
                            "nova_contratacao"
                        ).replaceAll(
                          "_",
                          " "
                        )}
                      </span>
                    </td>

                    <td className="p-4 font-semibold text-emerald-400">
                      {formatarMoeda(
                        item.valor || 0
                      )}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold
                        ${
                          item.status ===
                          "aprovado"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : item.status ===
                              "pendente"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="p-4 text-zinc-400">
                      {formatarData(
                        item.criado_em
                      )}
                    </td>
                  </tr>
                )
              )}

              {pagamentos.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-10 text-center text-zinc-500"
                  >
                    Nenhum pagamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}