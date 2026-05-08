"use client";

type Props = {
  servicosAtivos: number;
  totalServicos: number;
  whatsappsConectados: number;
  pagamentos: number;
  telefoneVerificado: boolean;
};

export default function ClienteMetricasPremium({
  servicosAtivos,
  totalServicos,
  whatsappsConectados,
  pagamentos,
  telefoneVerificado,
}: Props) {
  const cards = [
    {
      titulo: "Serviços ativos",
      valor: servicosAtivos,
      descricao: "Automações liberadas",
      cor: "from-green-600/20 to-green-900/10 border-green-700/40",
    },
    {
      titulo: "Total de serviços",
      valor: totalServicos,
      descricao: "Serviços vinculados",
      cor: "from-blue-600/20 to-blue-900/10 border-blue-700/40",
    },
    {
      titulo: "WhatsApps online",
      valor: whatsappsConectados,
      descricao: "Instâncias conectadas",
      cor: "from-purple-600/20 to-purple-900/10 border-purple-700/40",
    },
    {
      titulo: "Pagamentos",
      valor: pagamentos,
      descricao: "Histórico geral",
      cor: "from-yellow-600/20 to-yellow-900/10 border-yellow-700/40",
    },
    {
      titulo: "Verificação",
      valor: telefoneVerificado ? "OK" : "Pendente",
      descricao: telefoneVerificado
        ? "WhatsApp confirmado"
        : "Confirmação necessária",
      cor: telefoneVerificado
        ? "from-emerald-600/20 to-emerald-900/10 border-emerald-700/40"
        : "from-red-600/20 to-red-900/10 border-red-700/40",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.titulo}
          className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br ${card.cor} backdrop-blur p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl`}
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full blur-3xl" />

          <div className="relative z-10">
            <p className="text-gray-400 text-sm">{card.titulo}</p>

            <h3 className="text-4xl font-black mt-3 tracking-tight">
              {card.valor}
            </h3>

            <p className="text-gray-500 text-xs mt-3">
              {card.descricao}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}