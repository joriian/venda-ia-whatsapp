"use client";

import { useEffect, useMemo, useState } from "react";

export default function ClientePage() {
  const [token, setToken] = useState("");
  const [dados, setDados] = useState<any>(null);
  const [aba, setAba] = useState("resumo");
  const [loading, setLoading] = useState(true);
  const [erroSessao, setErroSessao] = useState("");

  const [pagando, setPagando] = useState("");
  const [buscaPagamento, setBuscaPagamento] = useState("");
  const [filtroPagamento, setFiltroPagamento] = useState("todos");

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [alterandoSenha, setAlterandoSenha] = useState(false);

  useEffect(() => {
    iniciarSessao();
  }, []);

  async function iniciarSessao() {
    setLoading(true);

    const params = new URLSearchParams(window.location.search);

    const tokenUrl = params.get("token");
    const clienteUrl = params.get("cliente");
    const adminUrl = params.get("admin");

    if (tokenUrl) {
      localStorage.setItem("clienteToken", tokenUrl);
    }

    if (clienteUrl) {
      localStorage.setItem("clienteId", clienteUrl);
    }

    if (adminUrl) {
      localStorage.setItem("clienteAcessoAdmin", "1");
    }

    const tokenFinal = tokenUrl || localStorage.getItem("clienteToken");

    if (!tokenFinal) {
      setLoading(false);
      setErroSessao("Sessão não encontrada. Faça login novamente.");
      return;
    }

    setToken(tokenFinal);
    await carregarDados(tokenFinal);
  }

  async function carregarDados(tokenParam = token) {
    try {
      const res = await fetch("/api/cliente/dados", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: tokenParam }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setErroSessao(data.detalhe || data.error || "Sessão inválida.");
        setDados(null);
        return;
      }

      setErroSessao("");
      setDados(data);
    } catch (error) {
      console.error(error);
      setErroSessao("Erro ao carregar dados do cliente.");
    } finally {
      setLoading(false);
    }
  }

  async function contratar(servicoId: string, planoId: string) {
    setPagando(planoId);

    try {
      const res = await fetch("/api/cliente/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          servicoId,
          planoId,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error || !data.init_point) {
        alert(data.error || "Erro ao gerar pagamento.");
        return;
      }

      window.location.href = data.init_point;
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar pagamento.");
    } finally {
      setPagando("");
    }
  }

  async function alterarSenha() {
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      alert("Preencha todos os campos de senha.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      alert("A nova senha e a confirmação não são iguais.");
      return;
    }

    setAlterandoSenha(true);

    try {
      const res = await fetch("/api/cliente/alterar-senha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          senhaAtual,
          novaSenha,
          confirmarSenha,
        }),
      });

      const data = await res.json();

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
      setAlterandoSenha(false);
    }
  }

  function limparSessaoLocal() {
    localStorage.removeItem("clienteToken");
    localStorage.removeItem("clienteId");
    localStorage.removeItem("clienteNome");
    localStorage.removeItem("clienteEmail");
    localStorage.removeItem("clienteAcessoAdmin");
  }

  function sair() {
    limparSessaoLocal();
    window.location.href = "/login";
  }

  function irLogin() {
    limparSessaoLocal();
    window.location.href = "/login";
  }

  function dinheiro(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function dataPt(data: string) {
    if (!data) return "-";
    return new Date(data).toLocaleDateString("pt-BR");
  }

  function statusPt(status: string) {
    const mapa: any = {
      ativo: "Ativo",
      vencido: "Vencido",
      aguardando_pagamento: "Aguardando pagamento",
      approved: "Aprovado",
      pending: "Pendente",
      rejected: "Recusado",
      cancelado: "Cancelado",
      connecting: "Conectando",
      open: "Conectado",
      conectado: "Conectado",
      close: "Desconectado",
      desconectado: "Desconectado",
      qrcode: "Aguardando QR Code",
    };

    return mapa[status] || status || "-";
  }

  const cliente = dados?.cliente;
  const servicosCliente = dados?.servicosCliente || [];
  const pagamentos = dados?.pagamentos || [];
  const catalogo = dados?.catalogo || [];
  const instancia = dados?.instancia;

  const servicosAtivos = useMemo(() => {
    return servicosCliente.filter((s: any) => s.status === "ativo");
  }, [servicosCliente]);

  const pagamentosFiltrados = useMemo(() => {
    const busca = buscaPagamento.toLowerCase().trim();

    return pagamentos
      .filter((p: any) => {
        const texto = [
          p.status,
          p.valor,
          p.cupom_codigo,
          p.payment_id,
          p.mercado_pago_id,
          p.plano_nome,
        ]
          .join(" ")
          .toLowerCase();

        const statusAtual = statusPt(p.status).toLowerCase();

        const bateBusca = !busca || texto.includes(busca);
        const bateFiltro =
          filtroPagamento === "todos" ||
          statusAtual === filtroPagamento ||
          String(p.status || "").toLowerCase() === filtroPagamento;

        return bateBusca && bateFiltro;
      })
      .slice(0, 5);
  }, [pagamentos, buscaPagamento, filtroPagamento]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Carregando área do cliente...</p>
      </main>
    );
  }

  if (erroSessao) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-xl w-full">
          <h1 className="text-2xl font-bold mb-3">Não foi possível abrir a área do cliente</h1>

          <p className="text-gray-300 mb-4">{erroSessao}</p>

          <p className="text-gray-500 text-sm mb-4 break-all">
            Token atual: {token || "sem token"}
          </p>

          <button
            onClick={irLogin}
            className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-lg font-bold"
          >
            Ir para login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Área do Cliente</h1>
            <p className="text-gray-400 text-sm mt-1">
              Olá, {cliente?.nome || "cliente"} — {cliente?.email}
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => carregarDados()}
              className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-5 py-3 rounded-lg font-semibold"
            >
              Atualizar
            </button>

            <button
              onClick={sair}
              className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded-lg font-semibold"
            >
              Sair
            </button>
          </div>
        </div>

        <nav className="flex gap-2 flex-wrap mb-8 bg-zinc-900 border border-zinc-700 p-2 rounded-2xl">
          <Aba ativa={aba === "resumo"} onClick={() => setAba("resumo")}>Resumo</Aba>
          <Aba ativa={aba === "servicos"} onClick={() => setAba("servicos")}>Meus serviços</Aba>
          <Aba ativa={aba === "planos"} onClick={() => setAba("planos")}>Contratar planos</Aba>
          <Aba ativa={aba === "pagamentos"} onClick={() => setAba("pagamentos")}>Pagamentos</Aba>
          <Aba ativa={aba === "conta"} onClick={() => setAba("conta")}>Minha conta</Aba>
        </nav>

        {aba === "resumo" && (
          <section>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card titulo="Serviços ativos" valor={servicosAtivos.length} />
              <Card titulo="Total de serviços" valor={servicosCliente.length} />
              <Card titulo="Pagamentos" valor={pagamentos.length} />
              <Card titulo="WhatsApp" valor={statusPt(instancia?.status || "desconectado")} />
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">Resumo da conta</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Info label="Nome" value={cliente?.nome} />
                <Info label="Email" value={cliente?.email} />
                <Info label="Telefone" value={cliente?.telefone || "-"} />
                <Info label="Status geral" value={statusPt(cliente?.status)} />
              </div>
            </div>
          </section>
        )}

        {aba === "servicos" && (
          <section className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">Meus serviços</h2>

            <div className="grid gap-4">
              {servicosCliente.map((item: any) => (
                <div key={item.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold">{item.servicos_ia?.nome || "Serviço"}</h3>
                      <p className="text-gray-400 text-sm">
                        Plano: {item.planos?.nome || item.plano_id || "-"}
                      </p>
                    </div>

                    <Status status={statusPt(item.status)} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <Info label="Início" value={dataPt(item.data_inicio)} />
                    <Info label="Expiração" value={dataPt(item.data_expiracao)} />
                    <Info label="Criado em" value={dataPt(item.created_at)} />
                  </div>
                </div>
              ))}

              {servicosCliente.length === 0 && (
                <p className="text-gray-400">Você ainda não possui serviços contratados.</p>
              )}
            </div>
          </section>
        )}

        {aba === "pagamentos" && (
          <section className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Histórico de pagamentos</h2>
                <p className="text-gray-400 text-sm">Exibindo os últimos 5 pagamentos encontrados.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full lg:w-auto">
                <input
                  value={buscaPagamento}
                  onChange={(e) => setBuscaPagamento(e.target.value)}
                  placeholder="Pesquisar pagamento..."
                  className="p-3 rounded bg-zinc-800 border border-zinc-700 min-w-[260px]"
                />

                <select
                  value={filtroPagamento}
                  onChange={(e) => setFiltroPagamento(e.target.value)}
                  className="p-3 rounded bg-zinc-800 border border-zinc-700"
                >
                  <option value="todos">Todos</option>
                  <option value="ativo">Ativo</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="pendente">Pendente</option>
                  <option value="recusado">Recusado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border border-zinc-700 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-800 border-b border-zinc-700 text-left">
                    <th className="p-3">Data</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Valor</th>
                    <th className="p-3">Cupom</th>
                    <th className="p-3">Pagamento</th>
                  </tr>
                </thead>

                <tbody>
                  {pagamentosFiltrados.map((p: any) => (
                    <tr key={p.id} className="border-b border-zinc-800">
                      <td className="p-3">{dataPt(p.created_at || p.criado_em)}</td>
                      <td className="p-3">{statusPt(p.status)}</td>
                      <td className="p-3">{dinheiro(p.valor)}</td>
                      <td className="p-3">{p.cupom_codigo || "-"}</td>
                      <td className="p-3">{p.payment_id || p.mercado_pago_id || "-"}</td>
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
          </section>
        )}

        {aba === "planos" && (
          <section className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-2">Contratar ou renovar serviços</h2>
            <p className="text-gray-400 text-sm mb-6">
              Escolha um serviço e um plano para adicionar à sua conta.
            </p>

            <div className="grid gap-8">
              {catalogo.map((servico: any) => (
                <div key={servico.id} className="border border-zinc-700 rounded-xl p-5">
                  <h3 className="text-xl font-bold">{servico.nome}</h3>

                  <p className="text-gray-400 text-sm mt-1 mb-4">
                    {servico.descricao || "Serviço disponível para contratação."}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(servico.planos || [])
                      .filter((p: any) => p.ativo)
                      .map((plano: any) => (
                        <div
                          key={plano.id}
                          className={`relative bg-zinc-800 border rounded-xl p-5 ${
                            plano.destaque ? "border-green-500" : "border-zinc-700"
                          }`}
                        >
                          {plano.destaque && (
                            <span className="absolute -top-3 left-4 bg-green-600 px-3 py-1 rounded-full text-xs font-bold">
                              Mais escolhido
                            </span>
                          )}

                          <h4 className="text-lg font-bold">{plano.nome}</h4>

                          <p className="text-gray-400 text-sm mt-2">
                            {plano.descricao || "Plano disponível."}
                          </p>

                          <p className="text-3xl font-bold mt-4">
                            {dinheiro(plano.valor)}
                          </p>

                          <p className="text-gray-400 text-sm mt-1">
                            {plano.meses} {plano.meses === 1 ? "mês" : "meses"}
                          </p>

                          <button
                            onClick={() => contratar(servico.id, plano.id)}
                            disabled={pagando === plano.id}
                            className="mt-5 w-full bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 py-3 rounded-lg font-bold"
                          >
                            {pagando === plano.id ? "Gerando..." : "Contratar"}
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              ))}

              {catalogo.length === 0 && (
                <p className="text-gray-400">Nenhum serviço disponível para contratação.</p>
              )}
            </div>
          </section>
        )}

        {aba === "conta" && (
          <section className="grid gap-6">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">Minha conta</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Info label="Nome" value={cliente?.nome} />
                <Info label="Email" value={cliente?.email} />
                <Info label="Telefone" value={cliente?.telefone || "-"} />
                <Info label="Endereço" value={cliente?.endereco || "-"} />
                <Info label="Documento" value={cliente?.documento || "-"} />
                <Info label="Status" value={statusPt(cliente?.status)} />
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-2">Alterar senha</h2>

              <p className="text-gray-400 text-sm mb-4">
                A senha precisa ter no mínimo 8 caracteres, uma letra maiúscula,
                uma letra minúscula, um número e um caractere especial.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="Senha atual"
                  className="p-3 rounded bg-zinc-800 border border-zinc-700"
                />

                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Nova senha"
                  className="p-3 rounded bg-zinc-800 border border-zinc-700"
                />

                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Confirmar nova senha"
                  className="p-3 rounded bg-zinc-800 border border-zinc-700"
                />

                <button
                  onClick={alterarSenha}
                  disabled={alterandoSenha}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 rounded font-bold"
                >
                  {alterandoSenha ? "Alterando..." : "Alterar senha"}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Aba({ ativa, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 rounded-xl font-semibold ${
        ativa ? "bg-green-600 text-white" : "bg-zinc-800 text-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

function Card({ titulo, valor }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <p className="text-gray-400 text-sm">{titulo}</p>
      <p className="text-2xl font-bold mt-2">{valor}</p>
    </div>
  );
}

function Info({ label, value }: any) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="font-bold break-all">{value || "-"}</p>
    </div>
  );
}

function Status({ status }: any) {
  const ativo = status === "Ativo" || status === "Aprovado";

  return (
    <span
      className={`px-3 py-1 rounded-full border text-xs font-bold ${
        ativo
          ? "bg-green-900/40 text-green-400 border-green-700"
          : "bg-yellow-900/40 text-yellow-400 border-yellow-700"
      }`}
    >
      {status || "-"}
    </span>
  );
}