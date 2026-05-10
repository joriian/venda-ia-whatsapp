"use client";

function StatusBadge({ status }: any) {
  const s = String(status || "").toLowerCase();

  const ativo = [
    "ativo",
    "aprovado",
    "conectado",
    "open",
    "connected",
  ].includes(s);

  const aguardando = [
    "pendente",
    "connecting",
    "qrcode",
  ].includes(s);

  return (
    <span
      className={`px-3 py-1 rounded-full border text-xs font-bold w-fit ${
        ativo
          ? "bg-green-900/40 text-green-400 border-green-700"
          : aguardando
          ? "bg-yellow-900/40 text-yellow-400 border-yellow-700"
          : "bg-red-900/40 text-red-400 border-red-700"
      }`}
    >
      {status || "-"}
    </span>
  );
}

function Info({ label, value }: any) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4">
      <p className="text-gray-400 text-xs mb-1">
        {label}
      </p>

      <p className="font-bold break-all text-sm">
        {value || "-"}
      </p>
    </div>
  );
}

export default function WhatsAppServicoCard({
  item,
  qrcodeSrc,
  statusPt,
  dataPt,
  dataHoraPt,
  controlarInstancia,
}: any) {
  const evolution = item.evolution || {};

  const conectado = Boolean(
    evolution.conectado
  );

  const qr =
    evolution.qrcode ||
    item.evolution_qrcode;

  const statusServico = String(
    item.status || ""
  ).toLowerCase();

  const bloqueado = [
    "vencido",
    "bloqueado",
    "cancelado",
    "suspenso",
  ].includes(statusServico);

  return (
    <div
      className={`border rounded-3xl overflow-hidden ${
        bloqueado
          ? "bg-red-950/20 border-red-700"
          : "bg-zinc-900 border-zinc-700"
      }`}
    >
      <div
        className={`p-5 border-b ${
          bloqueado
            ? "border-red-800"
            : "border-zinc-800"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold">
              {item.servicos_ia?.nome ||
                "Serviço"}
            </h3>

            <p className="text-gray-400 text-sm mt-1">
              Plano:{" "}
              {item.planos?.nome ||
                item.plano_id ||
                "-"}
            </p>

            {bloqueado && (
              <div className="mt-3 bg-red-900/40 border border-red-700 rounded-2xl p-3">
                <p className="text-red-400 font-bold text-sm">
                  Serviço bloqueado
                </p>

                <p className="text-gray-300 text-xs mt-1">
                  Seu plano expirou ou foi
                  suspenso. Renove para
                  voltar a utilizar o
                  WhatsApp e a IA.
                </p>
              </div>
            )}
          </div>

          <StatusBadge
            status={statusPt(
              item.status
            )}
          />
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        <div
          className={`border rounded-3xl p-4 flex items-center justify-center min-h-[260px] ${
            bloqueado
              ? "bg-red-950/20 border-red-800"
              : "bg-zinc-800 border-zinc-700"
          }`}
        >
          {bloqueado ? (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center mx-auto mb-4 text-3xl font-black">
                !
              </div>

              <p className="font-bold text-red-400">
                Serviço bloqueado
              </p>

              <p className="text-gray-400 text-sm mt-1">
                Renove o plano para
                liberar novamente a
                conexão WhatsApp.
              </p>
            </div>
          ) : conectado ? (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center mx-auto mb-4 text-3xl font-black">
                ✓
              </div>

              <p className="font-bold text-green-400">
                WhatsApp conectado
              </p>

              <p className="text-gray-400 text-sm mt-1">
                Esta automação já está
                pronta para uso.
              </p>
            </div>
          ) : qr ? (
            <div className="text-center">
              <img
                src={qrcodeSrc(qr)}
                alt="QR Code WhatsApp"
                className="w-56 h-56 object-contain bg-white rounded-2xl p-2 mx-auto"
              />

              <p className="text-gray-400 text-xs mt-3">
                Escaneie no WhatsApp
                para conectar.
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-yellow-600 flex items-center justify-center mx-auto mb-4 text-3xl font-black">
                !
              </div>

              <p className="font-bold text-yellow-400">
                QR Code ainda não
                recebido
              </p>

              <p className="text-gray-400 text-sm mt-1">
                Clique em Novo QR Code
                ou aguarde a Evolution
                gerar o QR Code.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
          <Info
            label="Instância"
            value={
              evolution.instance_name ||
              item.instance_name ||
              "-"
            }
          />

          <Info
            label="Status"
            value={statusPt(
              evolution.status ||
                item.evolution_status ||
                "desconectado"
            )}
          />

          <Info
            label="Número"
            value={
              evolution.numero ||
              item.evolution_numero ||
              "-"
            }
          />

          <Info
            label="Nome conectado"
            value={
              evolution.nome || "-"
            }
          />

          <Info
            label="Vencimento"
            value={dataPt(
              item.data_expiracao
            )}
          />

          <Info
            label="Atualizado em"
            value={dataHoraPt(
              evolution.atualizado_em
            )}
          />

          {!bloqueado && (
            <div className="md:col-span-2 grid grid-cols-2 xl:grid-cols-4 gap-3 mt-2">
              <button
                onClick={() =>
                  controlarInstancia(
                    item.id,
                    "status"
                  )
                }
                className="bg-blue-600 hover:bg-blue-700 py-3 rounded-2xl font-bold text-sm"
              >
                Atualizar
              </button>

              <button
                onClick={() =>
                  controlarInstancia(
                    item.id,
                    "qrcode"
                  )
                }
                className="bg-yellow-600 hover:bg-yellow-700 py-3 rounded-2xl font-bold text-sm"
              >
                Novo QR Code
              </button>

              <button
                onClick={() =>
                  controlarInstancia(
                    item.id,
                    "reiniciar"
                  )
                }
                className="bg-purple-600 hover:bg-purple-700 py-3 rounded-2xl font-bold text-sm"
              >
                Reiniciar
              </button>

              <button
                onClick={() => {
                  if (
                    confirm(
                      "Deseja realmente desconectar este WhatsApp?"
                    )
                  ) {
                    controlarInstancia(
                      item.id,
                      "desconectar"
                    );
                  }
                }}
                className="bg-red-600 hover:bg-red-700 py-3 rounded-2xl font-bold text-sm"
              >
                Desconectar
              </button>
            </div>
          )}

          {bloqueado && (
            <div className="md:col-span-2 bg-red-900/20 border border-red-700 rounded-2xl p-4">
              <p className="text-red-400 font-bold text-sm">
                Ações desativadas
              </p>

              <p className="text-gray-300 text-sm mt-1">
                Esta instância não pode
                ser controlada enquanto
                o serviço estiver
                vencido ou bloqueado.
              </p>
            </div>
          )}

          <div className="md:col-span-2 bg-zinc-800 border border-zinc-700 rounded-2xl p-4">
            <p className="text-gray-400 text-xs mb-1">
              Orientação
            </p>

            <p className="text-sm text-gray-300">
              Cada serviço usa uma
              conexão própria. Para usar
              mais de uma IA, conecte um
              WhatsApp em cada serviço
              contratado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}