"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminVerificacaoWhatsappPage() {
  const router = useRouter();

  const [adminToken, setAdminToken] = useState("");

  const [instanceName, setInstanceName] = useState("");
  const [numero, setNumero] = useState("");
  const [ativo, setAtivo] = useState(false);

  const [status, setStatus] = useState("close");
  const [qrcode, setQrcode] = useState("");

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    const token =
      localStorage.getItem("adminToken") || "";

    if (!token) {
      router.replace("/admin/login");
      return;
    }

    setAdminToken(token);

    carregar(token);
  }, [router]);

  async function carregar(token: string) {
    try {
      setLoading(true);

      const res = await fetch(
        "/api/admin/configuracao-verificacao",
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
            "Erro ao carregar configuração."
        );

        return;
      }

      setInstanceName(
        data.configuracao?.instance_name || ""
      );

      setNumero(
        data.configuracao?.numero || ""
      );

      setAtivo(
        Boolean(
          data.configuracao?.ativo
        )
      );

      setStatus(
        data.configuracao?.status ||
          "close"
      );

      setQrcode(
        data.configuracao?.qrcode || ""
      );
    } catch (error) {
      console.log(error);

      alert(
        "Erro ao carregar configuração."
      );
    } finally {
      setLoading(false);
    }
  }

  async function salvar() {
    if (!instanceName.trim()) {
      alert(
        "Informe o nome da instância Evolution."
      );

      return;
    }

    if (!numero.trim()) {
      alert(
        "Informe o número remetente."
      );

      return;
    }

    try {
      setSalvando(true);

      const res = await fetch(
        "/api/admin/configuracao-verificacao",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-admin-token":
              adminToken,
          },

          body: JSON.stringify({
            instance_name:
              instanceName.trim(),

            numero:
              numero.trim(),

            ativo,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(
          data.error ||
            "Erro ao salvar configuração."
        );

        return;
      }

      setStatus(
        data.configuracao?.status ||
          "close"
      );

      setQrcode(
        data.configuracao?.qrcode || ""
      );

      alert(
        "Número de verificação salvo."
      );
    } catch (error) {
      console.log(error);

      alert(
        "Erro ao salvar configuração."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (
      !confirm(
        "Deseja realmente excluir esta instância de verificação?"
      )
    ) {
      return;
    }

    try {
      setExcluindo(true);

      const res = await fetch(
        "/api/admin/configuracao-verificacao",
        {
          method: "DELETE",

          headers: {
            "x-admin-token":
              adminToken,
          },
        }
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(
          data.error ||
            "Erro ao excluir."
        );

        return;
      }

      setInstanceName("");
      setNumero("");
      setAtivo(false);

      setStatus("close");
      setQrcode("");

      alert(
        "Número de verificação removido."
      );
    } catch (error) {
      console.log(error);

      alert(
        "Erro ao excluir."
      );
    } finally {
      setExcluindo(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Carregando...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <button
          onClick={() =>
            router.push("/admin")
          }
          className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-4 py-3 rounded-2xl font-bold"
        >
          Voltar ao admin
        </button>

        <section className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6">
          <h1 className="text-3xl font-black">
            Número de verificação
          </h1>

          <p className="text-gray-400 mt-2">
            Configure o WhatsApp oficial
            que enviará os códigos de
            verificação aos clientes.
          </p>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Nome da instância Evolution
              </label>

              <input
                value={instanceName}
                onChange={(e) =>
                  setInstanceName(
                    e.target.value
                  )
                }
                placeholder="Ex: nexora-verificacao"
                className="w-full p-4 rounded-2xl bg-zinc-800 border border-zinc-700"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Número remetente
              </label>

              <input
                value={numero}
                onChange={(e) =>
                  setNumero(
                    e.target.value
                  )
                }
                placeholder="5599999999999"
                className="w-full p-4 rounded-2xl bg-zinc-800 border border-zinc-700"
              />
            </div>

            <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4">
              <p className="text-sm text-gray-400 mb-2">
                Status da conexão
              </p>

              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    status === "open"
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                />

                <span className="font-bold">
                  {status === "open"
                    ? "Conectado"
                    : "Desconectado"}
                </span>
              </div>
            </div>

            <label className="flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-2xl p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) =>
                  setAtivo(
                    e.target.checked
                  )
                }
                className="w-5 h-5"
              />

              <span className="font-bold">
                Ativar envio de códigos
              </span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={salvar}
                disabled={salvando}
                className="bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 py-4 rounded-2xl font-bold"
              >
                {salvando
                  ? "Salvando..."
                  : "Salvar / Reconectar"}
              </button>

              <button
                onClick={excluir}
                disabled={excluindo}
                className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-600 py-4 rounded-2xl font-bold"
              >
                {excluindo
                  ? "Excluindo..."
                  : "Excluir número"}
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6">
            <h2 className="text-xl font-bold mb-4">
              QR Code
            </h2>

            {status === "open" ? (
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-green-600 flex items-center justify-center mx-auto text-4xl font-black">
                  ✓
                </div>

                <p className="text-green-400 font-bold mt-4">
                  WhatsApp conectado
                </p>

                <p className="text-gray-400 text-sm mt-2">
                  Este número já está
                  pronto para enviar os
                  códigos de verificação.
                </p>
              </div>
            ) : qrcode ? (
              <div className="text-center">
                <img
                  src={qrcode}
                  alt="QR Code"
                  className="w-72 h-72 bg-white rounded-3xl p-3 mx-auto"
                />

                <p className="text-gray-400 text-sm mt-4">
                  Escaneie este QR Code
                  com o WhatsApp oficial
                  da plataforma.
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-yellow-600 flex items-center justify-center mx-auto text-4xl font-black">
                  !
                </div>

                <p className="text-yellow-400 font-bold mt-4">
                  QR Code indisponível
                </p>

                <p className="text-gray-400 text-sm mt-2">
                  Clique em salvar para
                  gerar uma nova conexão.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}