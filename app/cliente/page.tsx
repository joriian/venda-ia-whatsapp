"use client";

import { useEffect, useMemo, useState } from "react";

export default function ClientePage() {
  const [qr, setQr] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [clienteToken, setClienteToken] = useState("");
  const [cliente, setCliente] = useState<any>(null);
  const [plano, setPlano] = useState<any>(null);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [buscaPagamento, setBuscaPagamento] = useState("");
  const [status, setStatus] = useState("Validando sessão...");
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
  const [confirmarSenha, setConfirmarSenha] = useState("");

  useEffect(() => {
    iniciarSessao();
  }, []);

  const pagamentosFiltrados = useMemo(() => {
    const busca = buscaPagamento.toLowerCase().trim();

    const filtrados = pagamentos.filter((p) => {
      const texto = [
        p.status,
        p.plano_id,
        p.payment_id,
        p.mercado_pago_id,
        p.valor,
        p.created_at,
        p.criado_em,
      ]
        .join(" ")
        .toLowerCase();

      return !busca || texto.includes(busca);
    });

    return filtrados.slice(0, 5);
  }, [pagamentos, buscaPagamento]);

  async function iniciarSessao() {
    const token = localStorage.getItem("clienteToken");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      const res = await fetch("/api/cliente/sessao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        limparSessaoLocal();
        window.location.href = "/login";
        return;
      }

      const id = data.clienteId;
      const instance = `cliente_${id.replace(/-/g, "")}`;

      setClienteId(id);
      setClienteToken(token);
      setInstanceName(instance);

      localStorage.setItem("clienteId", id);
      localStorage.setItem("clienteNome", data.nome || "");
      localStorage.setItem("clienteEmail", data.email || "");

      await iniciar(id, token, instance);

      const interval = setInterval(() => {
        verificarStatus(instance);
      }, 5000);

      return () => clearInterval(interval);
    } catch (error) {
      console.error(error);
      limparSessaoLocal();
      window.location.href = "/login";
    }
  }

  async function iniciar(id: string, token: string, instance: string) {
    await carregarDados(id, token);
    await carregarPagamentos(id, token);

    const ativo = await validarCliente(id, token);

    if (!ativo) {
      return;
    }

    await verificarStatus(instance);
  }

  async function carregarDados(id: string, token: string) {
    try {
      const res = await fetch("/api/cliente/dados", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId: id,
          token,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        limparSessaoLocal();
        window.location.href = "/login";
        return;
      }

      if (data.ok) {
        setCliente(data.cliente);
        setPlano(data.plano);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function carregarPagamentos(id: string, token: string) {
    try {
      const res = await fetch("/api/cliente/pagamentos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId: id,
          token,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        limparSessaoLocal();
        window.location.href = "/login";
        return;
      }

      if (data.ok) {
        setPagamentos(data.pagamentos || []);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function validarCliente(id: string, token: string) {
    try {
      const res = await fetch("/api/cliente/validar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId: id,
          token,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        limparSessaoLocal();
        window.location.href = "/login";
        return false;
      }

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

  function senhaForte(senha: string) {
    const temMaiuscula = /[A-Z]/.test(senha);
    const temMinuscula = /[a-z]/.test(senha);
    const temNumero = /[0-9]/.test(senha);
    const temEspecial = /[^A-Za-z0-9]/.test(senha);
    const tamanhoOk = senha.length >= 8;

    return tamanhoOk && temMaiuscula && temMinuscula && temNumero && temEspecial;
  }

  async function alterarSenha() {
    if (!clienteId || !clienteToken) {
      alert("Sessão inválida. Faça login novamente.");
      limparSessaoLocal();
      window.location.href = "/login";
      return;
    }

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      alert("Preencha a senha atual, a nova senha e a confirmação.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      alert("A nova senha e a confirmação não são iguais.");
      return;
    }

    if (!senhaForte(novaSenha)) {
      alert(
        "A nova senha deve ter no mínimo 8 caracteres, com letra maiúscula, minúscula, número e caractere especial."
      );
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
          token: clienteToken,
          senhaAtual,
          novaSenha,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        alert(data.error || "Sessão inválida. Faça login novamente.");
        limparSessaoLocal();
        window.location.href = "/login";
        return;
      }

      if (!res.ok || data.error) {
        alert(data.error || "Erro ao alterar senha.");
        return;
      }

      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
      alert("Senha alterada com sucesso.");
    } catch (error) {
      console.error(error);
      alert("Erro ao alterar senha.");
    } finally {
      setLoadingSenha(false);
    }
  }

  async function sair() {
    const token = localStorage.getItem("clienteToken");

    try {
      await fetch("/api/cliente/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
    } catch {}

    limparSessaoLocal();
    window.location.href = "/login";
  }

  function limparSessaoLocal() {
    localStorage.removeItem("clienteToken");
    localStorage.removeItem("clienteId");
    localStorage.removeItem("clienteNome");
    localStorage.removeItem("clienteEmail");
    localStorage.removeItem("clienteSessaoExpira");
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

  function traduzirStatus(status: string) {
    const mapa: any = {
      approved: "Aprovado",
      pending: "Pendente",
      rejected: "Recusado",
      cancelled: "Cancelado",
      refunded: "Reembolsado",
      charged_back: "Estornado",
      approved_manual: "Aprovado manualmente",
    };

    return mapa[status] || status || "-";
  }

  function classeStatus(status: string) {
    if (status === "approved" || status === "approved_manual") {
      return "bg-green-900/40 text-green-400 border-green-700";
    }

    if (status === "pending") {
      return "bg-yellow-900/40 text-yellow-400 border-yellow-700";
    }

    if (
      status === "rejected" ||
      status === "cancelled" ||
      status === "charged_back"
    ) {
      return "bg-red-900/40 text-red-400 border-red-700";
    }

    return "bg-zinc-800 text-gray-300 border-zinc-700";
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
              Gerencie seu plano, pagamentos e conexão do WhatsApp.
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
          <Card titulo="Expira em" valor={dataFormatada(cliente?.data_expiracao)} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-2">Meu plano</h2>

            <p className="text-gray-400 text-sm mb-5">
              Informações do seu plano atual.
            </p>

            <div className="grid gap-3 text-sm">
              <Info label="Plano" value={plano?.nome || cliente?.plano_id || "-"} />
              <Info label="Valor" value={plano?.valor ? dinheiro(plano.valor) : "-"} />
              <Info label="Duração" value={plano?.meses ? `${plano.meses} mês(es)` : "-"} />
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
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold mb-2">Histórico de pagamentos</h2>
                <p className="text-gray-400 text-sm">
                  Exibindo os últimos 5 pagamentos encontrados.
                </p>
              </div>

              <input
                value={buscaPagamento}
                onChange={(e) => setBuscaPagamento(e.target.value)}
                placeholder="Buscar por status, plano, valor ou ID..."
                className="p-3 rounded bg-zinc-800 border border-zinc-700 w-full md:w-80"
              />
            </div>

            <div className="overflow-x-auto border border-zinc-700 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 text-left bg-zinc-800">
                    <th className="p-3">Data</th>
                    <th className="p-3">Plano</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Valor</th>
                    <th className="p-3">Pagamento</th>
                  </tr>
                </thead>

                <tbody>
                  {pagamentosFiltrados.map((pagamento) => (
                    <tr
                      key={pagamento.id || pagamento.payment_id}
                      className="border-b border-zinc-800"
                    >
                      <td className="p-3">
                        {dataFormatada(
                          pagamento.created_at ||
                            pagamento.criado_em ||
                            pagamento.data_criacao
                        )}
                      </td>

                      <td className="p-3">{pagamento.plano_id || "-"}</td>

                      <td className="p-3">
                        <span
                          className={`px-3 py-1 rounded-full border text-xs font-bold ${classeStatus(
                            pagamento.status
                          )}`}
                        >
                          {traduzirStatus(pagamento.status)}
                        </span>
                      </td>

                      <td className="p-3">{dinheiro(pagamento.valor || 0)}</td>

                      <td className="p-3">{pagamento.payment_id || "-"}</td>
                    </tr>
                  ))}

                  {pagamentosFiltrados.length === 0 && (
                    <tr>
                      <td className="p-5 text-center text-gray-400" colSpan={5}>
                        Nenhum pagamento encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => carregarPagamentos(clienteId, clienteToken)}
              className="mt-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-5 py-3 rounded-lg font-semibold"
            >
              Atualizar histórico
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl lg:col-span-2">
            <h2 className="text-xl font-bold mb-2">Alterar senha</h2>

            <p className="text-gray-400 text-sm mb-5">
              A senha precisa ter pelo menos 8 caracteres, uma letra maiúscula,
              uma letra minúscula, um número e um caractere especial.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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

              <input
                type="password"
                placeholder="Confirmar nova senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
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

function Info({ label, value }: { label: any; value: any }) {
  return (
    <div className="flex justify-between border-b border-zinc-800 pb-2">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}