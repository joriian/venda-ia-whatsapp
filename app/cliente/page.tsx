"use client";

import { useEffect, useState } from "react";

export default function ClientePage() {
  const [qr, setQr] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [cliente, setCliente] = useState<any>(null);
  const [plano, setPlano] = useState<any>(null);
  const [status, setStatus] = useState("Preparando área do cliente...");
  const [conectado, setConectado] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [numero, setNumero] = useState<string | null>(null);
  const [nomePerfil, setNomePerfil] = useState<string | null>(null);
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [loadingRenovar, setLoadingRenovar] = useState(false);
  const [loadingSenha, setLoadingSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idUrl = params.get("cliente");
    const idStorage = localStorage.getItem("clienteId");

    const id = idUrl || idStorage;

    if (!id) {
      window.location.href = "/login";
      return;
    }

    const instance = `cliente_${id.replace(/-/g, "")}`;

    setClienteId(id);
    setInstanceName(instance);

    iniciar(id, instance);

    const interval = setInterval(() => {
      verificarStatus(instance);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  async function iniciar(id: string, instance: string) {
    await carregarDados(id);

    const ativo = await validarCliente(id);

    if (!ativo) {
      return;
    }

    await verificarStatus(instance);
  }

  async function carregarDados(id: string) {
    try {
      const res = await fetch("/api/cliente/dados", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clienteId: id }),
      });

      const data = await res.json();

      if (data.ok) {
        setCliente(data.cliente);
        setPlano(data.plano);
        localStorage.setItem("clienteNome", data.cliente?.nome || "");
        localStorage.setItem("clienteEmail", data.cliente?.email || "");
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function validarCliente(id: string) {
    try {
      const res = await fetch("/api/cliente/validar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clienteId: id }),
      });

      const data = await res.json();

      if (!data.ativo) {
        setBloqueado(true);
        setStatus("Plano expirado.");
        return false;
      }

      setBloqueado(false);
      return true;
    } catch (error) {
      console.error(error);
      setStatus("Erro ao validar cliente.");
      return false;
    }
  }

  function ajustarQrCode(data: any) {
    const base64 =
      data?.base64 ||
      data?.qrcode?.base64 ||
      data?.qrcode ||
      data?.qr ||
      data?.code;

    if (!base64 || base64 === true) {
      return null;
    }

    const texto = String(base64);

    if (texto.startsWith("data:image")) {
      return texto;
    }

    return `data:image/png;base64,${texto}`;
  }

  async function verificarStatus(instance: string) {
    if (bloqueado) return;

    try {
      const res = await fetch("/api/instance/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ instanceName: instance }),
      });

      const data = await res.json();

      if (data.conectado) {
        setConectado(true);
        setNumero(data.numero || null);
        setNomePerfil(data.nomePerfil || null);
        setFotoPerfil(data.fotoPerfil || null);
        setQr(null);
        setStatus("WhatsApp conectado com sucesso.");
        return;
      }

      setConectado(false);
      setNumero(null);
      setNomePerfil(null);
      setFotoPerfil(null);

      if (data.status === "connecting") {
        setStatus("Aguardando leitura do QR Code.");
      } else if (data.status === "nao_encontrada") {
        setStatus("Instância ainda não encontrada.");
      } else {
        setStatus("WhatsApp desconectado. Gere um QR Code para conectar.");
      }
    } catch (error) {
      console.error(error);
      setStatus("Erro ao verificar status.");
    }
  }

  async function gerarQR() {
    if (!instanceName) {
      alert("Instância inválida.");
      return;
    }

    try {
      setLoadingQr(true);
      setStatus("Gerando QR Code...");

      const res = await fetch("/api/instance/qrcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ instanceName }),
      });

      const data = await res.json();
      const qrFinal = ajustarQrCode(data);

      if (qrFinal) {
        setQr(qrFinal);
        setConectado(false);
        setStatus("Escaneie o QR Code no WhatsApp.");
        return;
      }

      setStatus("QR ainda não disponível. Aguarde alguns segundos e tente novamente.");
    } catch (error) {
      console.error(error);
      setStatus("Erro ao gerar QR Code.");
    } finally {
      setLoadingQr(false);
    }
  }

  async function resetar() {
    if (!instanceName) {
      alert("Instância inválida.");
      return;
    }

    try {
      setLoadingReset(true);
      setQr(null);
      setStatus("Resetando conexão...");

      const res = await fetch("/api/instance/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ instanceName }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setStatus("Não foi possível resetar. Talvez a instância já esteja desconectada.");
        return;
      }

      setConectado(false);
      setStatus("Conexão resetada. Agora gere um novo QR Code.");
    } catch (error) {
      console.error(error);
      setStatus("Erro ao resetar conexão.");
    } finally {
      setLoadingReset(false);
    }
  }

  async function renovarPlano() {
    if (!clienteId) {
      alert("Cliente inválido.");
      return;
    }

    try {
      setLoadingRenovar(true);

      const res = await fetch("/api/pagamento/criar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clienteId }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        alert("Erro ao gerar link de renovação.");
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      alert("Erro ao renovar plano.");
    } finally {
      setLoadingRenovar(false);
    }
  }

  async function alterarSenha() {
    if (!senhaAtual || !novaSenha) {
      alert("Preencha a senha atual e a nova senha.");
      return;
    }

    try {
      setLoadingSenha(true);

      const res = await fetch("/api/cliente/alterar-senha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId,
          senhaAtual,
          novaSenha,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.error || "Erro ao alterar senha.");
        return;
      }

      setSenhaAtual("");
      setNovaSenha("");
      alert("Senha alterada com sucesso.");
    } catch (error) {
      console.error(error);
      alert("Erro ao alterar senha.");
    } finally {
      setLoadingSenha(false);
    }
  }

  function sair() {
    localStorage.removeItem("clienteId");
    localStorage.removeItem("clienteNome");
    localStorage.removeItem("clienteEmail");
    window.location.href = "/login";
  }

  function dinheiro(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function dataFormatada(data: string) {
    if (!data) return "-";

    return new Date(data).toLocaleDateString("pt-BR");
  }

  if (bloqueado) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white px-6">
        <div className="bg-zinc-900 border border-red-700 p-8 rounded-2xl text-center w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-red-500">
            Plano expirado
          </h1>

          <p className="text-gray-300 mb-6">
            Seu acesso foi bloqueado. Renove seu plano para continuar usando.
          </p>

          <button
            onClick={renovarPlano}
            disabled={loadingRenovar}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold"
          >
            {loadingRenovar ? "Gerando pagamento..." : "Renovar plano"}
          </button>

          <button
            onClick={sair}
            className="mt-3 w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg font-semibold"
          >
            Sair
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Área do Cliente</h1>
            <p className="text-gray-400 mt-1">
              Gerencie seu plano e sua conexão do WhatsApp.
            </p>
          </div>

          <button
            onClick={sair}
            className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-lg font-semibold"
          >
            Sair
          </button>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card titulo="Cliente" valor={cliente?.nome || "-"} />
          <Card titulo="Status do plano" valor={cliente?.status || "-"} />
          <Card
            titulo="Expira em"
            valor={dataFormatada(cliente?.data_expiracao)}
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-2">Meu plano</h2>

            <p className="text-gray-400 text-sm mb-5">
              Informações do seu plano atual.
            </p>

            <div className="grid gap-3 text-sm">
              <Info label="Plano" value={plano?.nome || cliente?.plano_id || "-"} />
              <Info
                label="Valor"
                value={plano?.valor ? dinheiro(plano.valor) : "-"}
              />
              <Info
                label="Duração"
                value={plano?.meses ? `${plano.meses} mês(es)` : "-"}
              />
              <Info label="Email" value={cliente?.email || "-"} />
              <Info label="Telefone" value={cliente?.telefone || "-"} />
            </div>

            <button
              onClick={renovarPlano}
              disabled={loadingRenovar}
              className="mt-6 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold"
            >
              {loadingRenovar ? "Gerando pagamento..." : "Renovar plano"}
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-2">WhatsApp</h2>

            <p className="text-gray-400 text-sm mb-5">{status}</p>

            {conectado && (
              <div className="mb-6 bg-green-900/30 border border-green-600 rounded-xl p-4 text-center">
                {fotoPerfil && (
                  <img
                    src={fotoPerfil}
                    alt="Foto do WhatsApp"
                    className="w-16 h-16 rounded-full mx-auto mb-3"
                  />
                )}

                <p className="text-green-400 font-bold">WhatsApp conectado</p>

                {nomePerfil && (
                  <p className="text-sm text-gray-300 mt-1">{nomePerfil}</p>
                )}

                {numero && (
                  <p className="text-xs text-gray-400 mt-1">{numero}</p>
                )}
              </div>
            )}

            {qr && !conectado && (
              <div className="mb-6 text-center">
                <img
                  src={qr}
                  alt="QR Code WhatsApp"
                  className="mx-auto bg-white p-3 rounded-xl w-64 h-64 object-contain"
                />
              </div>
            )}

            <div className="grid gap-3">
              {!conectado && (
                <button
                  onClick={gerarQR}
                  disabled={loadingQr || loadingReset}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold"
                >
                  {loadingQr ? "Gerando..." : "Gerar QR Code"}
                </button>
              )}

              <button
                onClick={resetar}
                disabled={loadingQr || loadingReset}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold"
              >
                {loadingReset ? "Resetando..." : "Resetar conexão"}
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl lg:col-span-2">
            <h2 className="text-xl font-bold mb-2">Alterar senha</h2>

            <p className="text-gray-400 text-sm mb-5">
              Use uma senha com pelo menos 6 caracteres.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="password"
                placeholder="Senha atual"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                className="p-3 rounded bg-zinc-800 border border-zinc-700"
              />

              <input
                type="password"
                placeholder="Nova senha"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="p-3 rounded bg-zinc-800 border border-zinc-700"
              />

              <button
                onClick={alterarSenha}
                disabled={loadingSenha}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 py-3 rounded font-bold"
              >
                {loadingSenha ? "Salvando..." : "Alterar senha"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ titulo, valor }: { titulo: string; valor: any }) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <p className="text-gray-400 text-sm">{titulo}</p>
      <p className="text-2xl font-bold mt-2">{valor}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between border-b border-zinc-800 pb-2">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}