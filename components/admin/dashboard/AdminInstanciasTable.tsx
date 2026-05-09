"use client";

import {
  RefreshCcw,
  QrCode,
  Power,
  RotateCw,
} from "lucide-react";

export default function AdminInstanciasTable({
  instancias,
  controlarInstanciaAdmin,
}: {
  instancias: any[];
  controlarInstanciaAdmin: (
    instanceName: string,
    acao: "status" | "qrcode" | "reiniciar" | "desconectar"
  ) => Promise<void>;
}) {
  return (
    <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black">
            Instâncias
          </h2>

          <p className="text-gray-500 mt-1">
            Controle em tempo real
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {instancias.map((i: any, index: number) => (
          <div
            key={i.instance || index}
            className="bg-[#131313] border border-white/5 rounded-2xl p-5"
          >
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold">
                    {i.instance}
                  </h3>

                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      i.conectado
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {i.conectado ? "ONLINE" : "OFFLINE"}
                  </div>
                </div>

                <p className="text-gray-500 mt-2">
                  {i.numero || "Sem número"}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <BotaoAcao
                  cor="blue"
                  icon={<RefreshCcw size={16} />}
                  texto="Atualizar"
                  onClick={() =>
                    controlarInstanciaAdmin(i.instance, "status")
                  }
                />

                <BotaoAcao
                  cor="yellow"
                  icon={<QrCode size={16} />}
                  texto="QR Code"
                  onClick={() =>
                    controlarInstanciaAdmin(i.instance, "qrcode")
                  }
                />

                <BotaoAcao
                  cor="purple"
                  icon={<RotateCw size={16} />}
                  texto="Reiniciar"
                  onClick={() =>
                    controlarInstanciaAdmin(i.instance, "reiniciar")
                  }
                />

                <BotaoAcao
                  cor="red"
                  icon={<Power size={16} />}
                  texto="Desconectar"
                  onClick={() =>
                    controlarInstanciaAdmin(i.instance, "desconectar")
                  }
                />
              </div>
            </div>
          </div>
        ))}

        {instancias.length === 0 && (
          <div className="bg-[#131313] border border-white/5 rounded-2xl p-8 text-center text-gray-500">
            Nenhuma instância encontrada.
          </div>
        )}
      </div>
    </div>
  );
}

function BotaoAcao({
  icon,
  texto,
  onClick,
  cor,
}: any) {
  const cores: any = {
    blue: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30",
    yellow: "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30",
    purple: "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30",
    red: "bg-red-500/20 text-red-400 hover:bg-red-500/30",
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${cores[cor]}`}
    >
      {icon}
      {texto}
    </button>
  );
}