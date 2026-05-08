"use client";

import { useEffect, useMemo, useState } from "react";

type AnyObj = any;

export default function ClientePage() {
  const [token, setToken] = useState("");
  const [dados, setDados] = useState<AnyObj>(null);
  const [aba, setAba] = useState("resumo");
  const [loading, setLoading] = useState(true);
  const [erroSessao, setErroSessao] = useState("");

  const [pagando, setPagando] = useState("");
  const [buscaPagamento, setBuscaPagamento] = useState("");
  const [filtroPagamento, setFiltroPagamento] = useState("todos");
  const [buscaPlano, setBuscaPlano] = useState("");
  const [cupomPorPlano, setCupomPorPlano] = useState<Record<string, string>>({});

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [alterandoSenha, setAlterandoSenha] = useState(false);

  const [logsIa, setLogsIa] = useState<AnyObj[]>([]);
  const [buscaLog, setBuscaLog] = useState("");
  const [filtroLog, setFiltroLog] = useState("todos");
  const [carregandoLogs, setCarregandoLogs] = useState(false);

  const [telefoneVerificacao, setTelefoneVerificacao] = useState("");
  const [codigoVerificacao, setCodigoVerificacao] = useState("");
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [verificandoCodigo, setVerificandoCodigo] = useState(false);

  useEffect(() => {
    iniciarSessao();
  }, []);

  async function iniciarSessao() {
    setLoading(true);

    const params = new URLSearchParams(window.location.search);
    const tokenUrl = params.get("token");
    const clienteUrl = params.get("cliente");
    const adminUrl = params.get("admin");

    if (tokenUrl) localStorage.setItem("clienteToken", tokenUrl);
    if (clienteUrl) localStorage.setItem("clienteId", clienteUrl);
    if (adminUrl) localStorage.setItem("clienteAcessoAdmin", "1");

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
      if (data?.cliente?.telefone) {
        setTelefoneVerificacao(data.cliente.telefone);
      }
    } catch (error) {
      console.error(error);
      setErroSessao("Erro ao carregar dados do cliente.");
    } finally {
      setLoading(false);
    }
  }

  async function contratar(servicoId: string, planoId: string) {
    if (!cliente?.telefone_verificado) {
      alert("Antes de contratar, verifique seu número de WhatsApp na aba Minha conta.");
      setAba("conta");
      return;
    }

    setPagando(planoId);

    try {
      const res = await fetch("/api/cliente/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          servico_id: servicoId,
          plano_id: planoId,
          cupom_codigo: cupomPorPlano[planoId] || null,
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

  async function controlarInstancia(
    clienteServicoId: string,
    acao: "status" | "qrcode" | "reiniciar" | "desconectar"
  ) {
    try {
      const res = await fetch("/api/cliente/evolution", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          cliente_servico_id: clienteServicoId,
          acao,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.detalhe || data.error || "Erro ao controlar instância.");
        return;
      }

      await carregarDados();

      if (acao === "status") {
        alert("Status atualizado.");
      }

      if (acao === "qrcode") {
        alert("QR Code solicitado. Aguarde alguns segundos e clique em Atualizar.");
      }

      if (acao === "reiniciar") {
        alert("Instância reiniciada.");
      }

      if (acao === "desconectar") {
        alert("WhatsApp desconectado.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao controlar instância.");
    }
  }

  async function carregarLogsIa() {
    setCarregandoLogs(true);

    try {
      const res = await fetch("/api/cliente/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          busca: buscaLog,
          status: filtroLog,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.detalhe || data.error || "Erro ao carregar logs da IA.");
        return;
      }

      setLogsIa(data.logs || []);
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar logs da IA.");
    } finally {
      setCarregandoLogs(false);
    }
  }

  useEffect(() => {
    if (aba === "logs" && token) {
      carregarLogsIa();
    }
  }, [aba, filtroLog, token]);

  async function enviarCodigoVerificacao() {
    setEnviandoCodigo(true);

    try {
      const res = await fetch("/api/cliente/enviar-codigo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          telefone: telefoneVerificacao || cliente?.telefone,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.detalhe || data.error || "Erro ao enviar código.");
        return;
      }

      alert("Código enviado pelo WhatsApp.");
      await carregarDados();
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar código.");
    } finally {
      setEnviandoCodigo(false);
    }
  }

  async function confirmarCodigoVerificacao() {
    if (!codigoVerificacao.trim()) {
      alert("Digite o código recebido no WhatsApp.");
      return;
    }

    setVerificandoCodigo(true);

    try {
      const res = await fetch("/api/cliente/verificar-codigo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          codigo: codigoVerificacao,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.detalhe || data.error || "Erro ao verificar código.");
        return;
      }

      setCodigoVerificacao("");
      alert("Telefone verificado com sucesso.");
      await carregarDados();
    } catch (error) {
      console.error(error);
      alert("Erro ao verificar código.");
    } finally {
      setVerificandoCodigo(false);
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

  function dataHoraPt(data: string) {
    if (!data) return "-";
    return new Date(data).toLocaleString("pt-BR");
  }

  function statusPt(status: string) {
    const mapa: AnyObj = {
      ativo: "Ativo",
      vencido: "Vencido",
      aguardando_pagamento: "Aguardando pagamento",
      approved: "Aprovado",
      pending: "Pendente",
      rejected: "Recusado",
      cancelado: "Cancelado",
      cancelled: "Cancelado",
      connecting: "Conectando",
      open: "Conectado",
      connected: "Conectado",
      conectado: "Conectado",
      close: "Desconectado",
      disconnected: "Desconectado",
      desconectado: "Desconectado",
      qrcode: "Aguardando QR Code",
    };

    return mapa[String(status || "").toLowerCase()] || status || "-";
  }

  function qrcodeSrc(qrcode: string) {
    if (!qrcode) return "";
    if (qrcode.startsWith("data:image")) return qrcode;
    return `data:image/png;base64,${qrcode}`;
  }

  const cliente = dados?.cliente;
  const servicosCliente = dados?.servicosCliente || [];
  const pagamentos = dados?.pagamentos || [];
  const catalogo = dados?.catalogo || [];

  const servicosAtivos = useMemo(() => {
    return servicosCliente.filter((s: any) => s.status === "ativo");
  }, [servicosCliente]);

  const servicosConectados = useMemo(() => {
    return servicosCliente.filter((s: any) => s.evolution?.conectado);
  }, [servicosCliente]);

  const pagamentosFiltrados = useMemo(() => {
    const busca = buscaPagamento.toLowerCase().trim();

    return pagamentos
      .filter((p: any) => {
        const texto = [
          p.status,
          p.valor,
          p.valor_original,
          p.desconto_valor,
          p.cupom_codigo,
          p.payment_id,
          p.mercado_pago_id,
          p.plano_id,
        ]
          .join(" ")
          .toLowerCase();

        const statusTraduzido = statusPt(p.status).toLowerCase();
        const bateBusca = !busca || texto.includes(busca);
        const bateFiltro =
          filtroPagamento === "todos" ||
          statusTraduzido === filtroPagamento ||
          String(p.status || "").toLowerCase() === filtroPagamento;

        return bateBusca && bateFiltro;
      })
      .slice(0, 5);
  }, [pagamentos, buscaPagamento, filtroPagamento]);

  const catalogoFiltrado = useMemo(() => {
    const busca = buscaPlano.toLowerCase().trim();

    return catalogo.filter((servico: any) => {
      const texto = [
        servico.nome,
        servico.slug,
        servico.descricao,
        ...(servico.planos || []).map((p: any) => `${p.nome} ${p.descricao} ${p.valor}`),
      ]
        .join(" ")
        .toLowerCase();

      return !busca || texto.includes(busca);
    });
  }, [catalogo, buscaPlano]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando área do cliente...</p>
        </div>
      </main>
    );
  }

  if (erroSessao) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 max-w-xl w-full">
          <h1 className="text-2xl font-bold mb-3">Não foi possível abrir a área do cliente</h1>
          <p className="text-gray-300 mb-4">{erroSessao}</p>
          <button onClick={irLogin} className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-xl font-bold">
            Ir para login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 mb-8">
          <div>
            <p className="text-green-400 font-bold text-sm uppercase tracking-wider">Painel do cliente</p>
            <h1 className="text-3xl md:text-4xl font-black mt-1">Olá, {cliente?.nome || "cliente"}</h1>
            <p className="text-gray-400 text-sm mt-2 break-all">{cliente?.email}</p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button onClick={() => carregarDados()} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-5 py-3 rounded-2xl font-bold">
              Atualizar
            </button>
            <button onClick={sair} className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded-2xl font-bold">
              Sair
            </button>
          </div>
        </div>

        <nav className="flex gap-2 flex-wrap mb-8 bg-zinc-900 border border-zinc-700 p-2 rounded-3xl sticky top-3 z-20 backdrop-blur">
          <Aba ativa={aba === "resumo"} onClick={() => setAba("resumo")}>Resumo</Aba>
          <Aba ativa={aba === "whatsapp"} onClick={() => setAba("whatsapp")}>WhatsApp</Aba>
          <Aba ativa={aba === "servicos"} onClick={() => setAba("servicos")}>Meus serviços</Aba>
          <Aba ativa={aba === "planos"} onClick={() => setAba("planos")}>Contratar planos</Aba>
          <Aba ativa={aba === "pagamentos"} onClick={() => setAba("pagamentos")}>Pagamentos</Aba>
          <Aba ativa={aba === "logs"} onClick={() => setAba("logs")}>Logs IA</Aba>
          <Aba ativa={aba === "conta"} onClick={() => setAba("conta")}>Minha conta</Aba>
        </nav>

        {aba === "resumo" && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card titulo="Serviços ativos" valor={servicosAtivos.length} texto="Contratações liberadas" />
              <Card titulo="Total de serviços" valor={servicosCliente.length} texto="Serviços na conta" />
              <Card titulo="WhatsApps conectados" valor={servicosConectados.length} texto="Instâncias online" />
              <Card titulo="Pagamentos" valor={pagamentos.length} texto="Histórico geral" />
              <Card
                titulo="WhatsApp verificado"
                valor={cliente?.telefone_verificado ? "Sim" : "Não"}
                texto={cliente?.telefone_verificado ? "Cliente liberado para compras" : "Verificação pendente"}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <PainelConta cliente={cliente} statusPt={statusPt} />

              <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold">Últimos pagamentos</h2>
                    <p className="text-gray-400 text-sm">Resumo dos 5 mais recentes.</p>
                  </div>
                  <button onClick={() => setAba("pagamentos")} className="text-green-400 font-bold text-sm">
                    Ver todos
                  </button>
                </div>

                <ListaPagamentos pagamentos={pagamentos.slice(0, 5)} statusPt={statusPt} dinheiro={dinheiro} dataPt={dataPt} />
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-bold">Seus serviços WhatsApp</h2>
                  <p className="text-gray-400 text-sm">Cada serviço possui uma instância própria.</p>
                </div>
                <button onClick={() => setAba("whatsapp")} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl font-bold text-sm">
                  Gerenciar
                </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {servicosCliente.slice(0, 4).map((item: any) => (
                  <ServicoResumoCard key={item.id} item={item} statusPt={statusPt} dataPt={dataPt} />
                ))}

                {servicosCliente.length === 0 && <Vazio texto="Você ainda não possui serviços contratados." />}
              </div>
            </div>
          </section>
        )}

        {aba === "whatsapp" && (
          <section className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
              <h2 className="text-2xl font-bold">Conexões WhatsApp</h2>
              <p className="text-gray-400 text-sm mt-1">
                Cada serviço tem uma instância separada para evitar conflito entre automações.
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {servicosCliente.map((item: any) => (
                <WhatsAppServicoCard
                  key={item.id}
                  item={item}
                  qrcodeSrc={qrcodeSrc}
                  statusPt={statusPt}
                  dataPt={dataPt}
                  dataHoraPt={dataHoraPt}
                  controlarInstancia={controlarInstancia}
                />
              ))}

              {servicosCliente.length === 0 && <Vazio texto="Nenhum serviço disponível para conexão." />}
            </div>
          </section>
        )}

        {aba === "servicos" && (
          <section className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
            <h2 className="text-2xl font-bold mb-2">Meus serviços</h2>
            <p className="text-gray-400 text-sm mb-6">Veja planos, vencimentos e status de cada serviço contratado.</p>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {servicosCliente.map((item: any) => (
                <ServicoDetalheCard key={item.id} item={item} statusPt={statusPt} dataPt={dataPt} />
              ))}

              {servicosCliente.length === 0 && <Vazio texto="Você ainda não possui serviços contratados." />}
            </div>
          </section>
        )}

        {aba === "pagamentos" && (
          <section className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
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
                  className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700 min-w-[260px]"
                />

                <select
                  value={filtroPagamento}
                  onChange={(e) => setFiltroPagamento(e.target.value)}
                  className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700"
                >
                  <option value="todos">Todos</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="pendente">Pendente</option>
                  <option value="recusado">Recusado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            <TabelaPagamentos pagamentos={pagamentosFiltrados} statusPt={statusPt} dinheiro={dinheiro} dataPt={dataPt} />
          </section>
        )}

        {aba === "logs" && (
          <section className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Logs da IA</h2>
                <p className="text-gray-400 text-sm">
                  Veja as últimas mensagens recebidas e se foram enviadas para a automação.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full lg:w-auto">
                <input
                  value={buscaLog}
                  onChange={(e) => setBuscaLog(e.target.value)}
                  placeholder="Buscar mensagem, remetente, instância..."
                  className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700 min-w-[260px]"
                />

                <select
                  value={filtroLog}
                  onChange={(e) => setFiltroLog(e.target.value)}
                  className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700"
                >
                  <option value="todos">Todos</option>
                  <option value="enviado">Enviados ao n8n</option>
                  <option value="erro">Com erro</option>
                </select>

                <button
                  onClick={carregarLogsIa}
                  className="bg-green-600 hover:bg-green-700 rounded-2xl font-bold py-3"
                >
                  {carregandoLogs ? "Buscando..." : "Buscar"}
                </button>
              </div>
            </div>

            <LogsIaSection logs={logsIa} dataHoraPt={dataHoraPt} />
          </section>
        )}

        {aba === "planos" && (
          <section className="space-y-6">
            {!cliente?.telefone_verificado && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-3xl p-5">
                <h2 className="text-xl font-bold text-yellow-400">Verifique seu WhatsApp antes de contratar</h2>
                <p className="text-gray-300 text-sm mt-2">
                  Para sua segurança, você precisa confirmar o número cadastrado antes de comprar ou renovar um plano.
                </p>
                <button
                  onClick={() => setAba("conta")}
                  className="mt-4 bg-yellow-600 hover:bg-yellow-700 px-5 py-3 rounded-2xl font-bold"
                >
                  Verificar agora
                </button>
              </div>
            )}
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
              <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Contratar ou renovar serviços</h2>
                  <p className="text-gray-400 text-sm mt-1">Escolha um serviço e um plano para adicionar à sua conta.</p>
                </div>

                <input
                  value={buscaPlano}
                  onChange={(e) => setBuscaPlano(e.target.value)}
                  placeholder="Pesquisar serviço ou plano..."
                  className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700 min-w-[280px]"
                />
              </div>
            </div>

            <div className="grid gap-8">
              {catalogoFiltrado.map((servico: any) => (
                <div key={servico.id} className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
                  <div className="mb-5">
                    <h3 className="text-2xl font-bold">{servico.nome}</h3>
                    <p className="text-gray-400 text-sm mt-1">{servico.descricao || "Serviço disponível para contratação."}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {(servico.planos || [])
                      .filter((p: any) => p.ativo)
                      .map((plano: any) => (
                        <div
                          key={plano.id}
                          className={`relative bg-zinc-800 border rounded-3xl p-5 ${plano.destaque ? "border-green-500" : "border-zinc-700"}`}
                        >
                          {plano.destaque && (
                            <span className="absolute -top-3 left-4 bg-green-600 px-3 py-1 rounded-full text-xs font-bold">
                              Mais escolhido
                            </span>
                          )}

                          <h4 className="text-xl font-bold">{plano.nome}</h4>
                          <p className="text-gray-400 text-sm mt-2 min-h-[42px]">{plano.descricao || "Plano disponível."}</p>

                          <p className="text-4xl font-black mt-5">{dinheiro(plano.valor)}</p>
                          <p className="text-gray-400 text-sm mt-1">{plano.meses} {plano.meses === 1 ? "mês" : "meses"}</p>

                          <input
                            value={cupomPorPlano[plano.id] || ""}
                            onChange={(e) => setCupomPorPlano((atual) => ({ ...atual, [plano.id]: e.target.value.toUpperCase() }))}
                            placeholder="Cupom de desconto"
                            className="mt-5 w-full p-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-sm"
                          />

                          <button
                            onClick={() => contratar(servico.id, plano.id)}
                            disabled={pagando === plano.id || !cliente?.telefone_verificado}
                            className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 py-3 rounded-2xl font-bold"
                          >
                            {!cliente?.telefone_verificado
                              ? "Verifique o WhatsApp"
                              : pagando === plano.id
                              ? "Gerando pagamento..."
                              : "Contratar"}
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              ))}

              {catalogoFiltrado.length === 0 && <Vazio texto="Nenhum serviço disponível para contratação." />}
            </div>
          </section>
        )}

        {aba === "conta" && (
          <section className="grid gap-6">
            <PainelConta cliente={cliente} statusPt={statusPt} grande />

            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
              <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-2xl font-bold">Verificação do WhatsApp</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Confirme seu número para liberar compras, renovações e notificações importantes.
                  </p>
                </div>

                <StatusBadge status={cliente?.telefone_verificado ? "Conectado" : "Pendente"} />
              </div>

              {cliente?.telefone_verificado ? (
                <div className="bg-green-900/30 border border-green-700 rounded-2xl p-4">
                  <p className="font-bold text-green-400">WhatsApp verificado</p>
                  <p className="text-gray-300 text-sm mt-1">
                    Número confirmado: {cliente?.telefone || "-"}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Verificado em: {dataHoraPt(cliente?.telefone_verificado_em)}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_180px_1fr_180px] gap-3">
                  <input
                    value={telefoneVerificacao}
                    onChange={(e) => setTelefoneVerificacao(e.target.value)}
                    placeholder="Telefone com DDD"
                    className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700"
                  />

                  <button
                    onClick={enviarCodigoVerificacao}
                    disabled={enviandoCodigo}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 rounded-2xl font-bold py-3"
                  >
                    {enviandoCodigo ? "Enviando..." : "Enviar código"}
                  </button>

                  <input
                    value={codigoVerificacao}
                    onChange={(e) => setCodigoVerificacao(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Código recebido"
                    className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700"
                  />

                  <button
                    onClick={confirmarCodigoVerificacao}
                    disabled={verificandoCodigo}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 rounded-2xl font-bold py-3"
                  >
                    {verificandoCodigo ? "Validando..." : "Confirmar"}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
              <h2 className="text-2xl font-bold mb-2">Alterar senha</h2>
              <p className="text-gray-400 text-sm mb-5">
                Use uma senha forte. A confirmação precisa ser igual à nova senha.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="Senha atual"
                  className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700"
                />

                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Nova senha"
                  className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700"
                />

                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Confirmar nova senha"
                  className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700"
                />

                <button
                  onClick={alterarSenha}
                  disabled={alterandoSenha}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 rounded-2xl font-bold py-3"
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
      className={`px-4 py-3 rounded-2xl font-bold text-sm ${ativa ? "bg-green-600 text-white" : "bg-zinc-800 text-gray-300 hover:bg-zinc-700"}`}
    >
      {children}
    </button>
  );
}

function Card({ titulo, valor, texto }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
      <p className="text-gray-400 text-sm">{titulo}</p>
      <p className="text-3xl font-black mt-2">{valor}</p>
      <p className="text-gray-500 text-xs mt-2">{texto}</p>
    </div>
  );
}

function StatusBadge({ status }: any) {
  const s = String(status || "").toLowerCase();
  const ativo = ["ativo", "aprovado", "conectado", "open", "connected"].includes(s);
  const aguardando = ["aguardando pagamento", "pendente", "connecting", "qrcode", "aguardando qr code"].includes(s);

  return (
    <span className={`px-3 py-1 rounded-full border text-xs font-bold w-fit ${ativo ? "bg-green-900/40 text-green-400 border-green-700" : aguardando ? "bg-yellow-900/40 text-yellow-400 border-yellow-700" : "bg-red-900/40 text-red-400 border-red-700"}`}>
      {status || "-"}
    </span>
  );
}

function PainelConta({ cliente, statusPt, grande = false }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
      <h2 className={`${grande ? "text-2xl" : "text-xl"} font-bold mb-4`}>Dados da conta</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Info label="Nome" value={cliente?.nome} />
        <Info label="Email" value={cliente?.email} />
        <Info label="Telefone" value={cliente?.telefone || "-"} />
        <Info label="Status geral" value={statusPt(cliente?.status)} />
        <Info label="Endereço" value={cliente?.endereco || "-"} />
        <Info label="Documento" value={cliente?.documento || "-"} />
      </div>
    </div>
  );
}

function Info({ label, value }: any) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="font-bold break-all text-sm">{value || "-"}</p>
    </div>
  );
}

function ServicoResumoCard({ item, statusPt, dataPt }: any) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-lg">{item.servicos_ia?.nome || "Serviço"}</h3>
          <p className="text-gray-400 text-sm">Plano: {item.planos?.nome || item.plano_id || "-"}</p>
        </div>
        <StatusBadge status={statusPt(item.status)} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <Info label="WhatsApp" value={statusPt(item.evolution?.status || item.evolution_status || "desconectado")} />
        <Info label="Vencimento" value={dataPt(item.data_expiracao)} />
      </div>
    </div>
  );
}

function ServicoDetalheCard({ item, statusPt, dataPt }: any) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-3xl p-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xl font-bold">{item.servicos_ia?.nome || "Serviço"}</h3>
          <p className="text-gray-400 text-sm mt-1">{item.servicos_ia?.descricao || "Serviço contratado."}</p>
        </div>
        <StatusBadge status={statusPt(item.status)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Info label="Plano" value={item.planos?.nome || item.plano_id || "-"} />
        <Info label="Início" value={dataPt(item.data_inicio)} />
        <Info label="Vencimento" value={dataPt(item.data_expiracao)} />
        <Info label="Instância" value={item.evolution?.instance_name || item.instance_name || "-"} />
        <Info label="WhatsApp" value={statusPt(item.evolution?.status || item.evolution_status || "desconectado")} />
        <Info label="Número" value={item.evolution?.numero || item.evolution_numero || "-"} />
      </div>
    </div>
  );
}

function WhatsAppServicoCard({ item, qrcodeSrc, statusPt, dataPt, dataHoraPt, controlarInstancia }: any) {
  const evolution = item.evolution || {};
  const conectado = Boolean(evolution.conectado);
  const qr = evolution.qrcode || item.evolution_qrcode;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden">
      <div className="p-5 border-b border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold">{item.servicos_ia?.nome || "Serviço"}</h3>
            <p className="text-gray-400 text-sm mt-1">Plano: {item.planos?.nome || item.plano_id || "-"}</p>
          </div>

          <StatusBadge status={statusPt(evolution.status || item.evolution_status || "desconectado")} />
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        <div className="bg-zinc-800 border border-zinc-700 rounded-3xl p-4 flex items-center justify-center min-h-[260px]">
          {conectado ? (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center mx-auto mb-4 text-3xl font-black">
                ✓
              </div>
              <p className="font-bold text-green-400">WhatsApp conectado</p>
              <p className="text-gray-400 text-sm mt-1">Esta automação já está pronta para uso.</p>
            </div>
          ) : qr ? (
            <div className="text-center">
              <img src={qrcodeSrc(qr)} alt="QR Code WhatsApp" className="w-56 h-56 object-contain bg-white rounded-2xl p-2 mx-auto" />
              <p className="text-gray-400 text-xs mt-3">Escaneie no WhatsApp para conectar.</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-yellow-600 flex items-center justify-center mx-auto mb-4 text-3xl font-black">
                !
              </div>
              <p className="font-bold text-yellow-400">QR Code ainda não recebido</p>
              <p className="text-gray-400 text-sm mt-1">Clique em Novo QR Code ou aguarde a Evolution gerar o QR Code.</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
          <Info label="Instância" value={evolution.instance_name || item.instance_name || "-"} />
          <Info label="Status" value={statusPt(evolution.status || item.evolution_status || "desconectado")} />
          <Info label="Número" value={evolution.numero || item.evolution_numero || "-"} />
          <Info label="Nome conectado" value={evolution.nome || "-"} />
          <Info label="Vencimento" value={dataPt(item.data_expiracao)} />
          <Info label="Atualizado em" value={dataHoraPt(evolution.atualizado_em)} />

          <div className="md:col-span-2 grid grid-cols-2 xl:grid-cols-4 gap-3 mt-2">
            <button
              onClick={() => controlarInstancia(item.id, "status")}
              className="bg-blue-600 hover:bg-blue-700 py-3 rounded-2xl font-bold text-sm"
            >
              Atualizar
            </button>

            <button
              onClick={() => controlarInstancia(item.id, "qrcode")}
              className="bg-yellow-600 hover:bg-yellow-700 py-3 rounded-2xl font-bold text-sm"
            >
              Novo QR Code
            </button>

            <button
              onClick={() => controlarInstancia(item.id, "reiniciar")}
              className="bg-purple-600 hover:bg-purple-700 py-3 rounded-2xl font-bold text-sm"
            >
              Reiniciar
            </button>

            <button
              onClick={() => {
                if (confirm("Deseja realmente desconectar este WhatsApp?")) {
                  controlarInstancia(item.id, "desconectar");
                }
              }}
              className="bg-red-600 hover:bg-red-700 py-3 rounded-2xl font-bold text-sm"
            >
              Desconectar
            </button>
          </div>

          <div className="md:col-span-2 bg-zinc-800 border border-zinc-700 rounded-2xl p-4">
            <p className="text-gray-400 text-xs mb-1">Orientação</p>
            <p className="text-sm text-gray-300">
              Cada serviço usa uma conexão própria. Para usar mais de uma IA, conecte um WhatsApp em cada serviço contratado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ListaPagamentos({ pagamentos, statusPt, dinheiro, dataPt }: any) {
  if (!pagamentos || pagamentos.length === 0) {
    return <Vazio texto="Nenhum pagamento encontrado." compacto />;
  }

  return (
    <div className="grid gap-3">
      {pagamentos.map((p: any) => (
        <div key={p.id} className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold">{dinheiro(p.valor)}</p>
              <p className="text-gray-400 text-xs mt-1">{dataPt(p.criado_em)}</p>
            </div>
            <StatusBadge status={statusPt(p.status)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function LogsIaSection({ logs, dataHoraPt }: any) {
  if (!logs || logs.length === 0) {
    return <Vazio texto="Nenhum log encontrado ainda." />;
  }

  return (
    <div className="grid gap-4">
      {logs.map((log: any) => (
        <div key={log.id} className="bg-zinc-800 border border-zinc-700 rounded-3xl p-5">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={`px-3 py-1 rounded-full border text-xs font-bold ${
                    log.enviado_n8n
                      ? "bg-green-900/40 text-green-400 border-green-700"
                      : "bg-red-900/40 text-red-400 border-red-700"
                  }`}
                >
                  {log.enviado_n8n ? "ENVIADO AO N8N" : "NÃO ENVIADO"}
                </span>

                <span className="bg-zinc-900 border border-zinc-700 px-3 py-1 rounded-full text-xs font-bold text-gray-300">
                  {log.evento || "Evento"}
                </span>
              </div>

              <h3 className="font-bold text-lg break-all">
                {log.servicos_ia?.nome || "Serviço"}
              </h3>

              <p className="text-gray-400 text-sm mt-1">
                {dataHoraPt(log.criado_em)}
              </p>
            </div>

            <div className="text-sm text-gray-400 xl:text-right">
              <p>Remetente: <span className="text-white font-bold break-all">{log.nome_remetente || log.remetente || "-"}</span></p>
              <p>Instância: <span className="text-white font-bold break-all">{log.instance_name || "-"}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mb-4">
            <Info label="Remetente" value={log.remetente || "-"} />
            <Info label="Nome" value={log.nome_remetente || "-"} />
            <Info label="Erro" value={log.erro_n8n || "-"} />
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4">
            <p className="text-gray-400 text-xs mb-2">Mensagem</p>
            <p className="text-sm whitespace-pre-wrap break-words">
              {log.mensagem || "Sem texto capturado."}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TabelaPagamentos({ pagamentos, statusPt, dinheiro, dataPt }: any) {
  return (
    <div className="overflow-x-auto border border-zinc-700 rounded-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-800 border-b border-zinc-700 text-left">
            <th className="p-3">Data</th>
            <th className="p-3">Status</th>
            <th className="p-3">Valor</th>
            <th className="p-3">Original</th>
            <th className="p-3">Desconto</th>
            <th className="p-3">Cupom</th>
            <th className="p-3">Pagamento</th>
          </tr>
        </thead>

        <tbody>
          {pagamentos.map((p: any) => (
            <tr key={p.id} className="border-b border-zinc-800">
              <td className="p-3">{dataPt(p.criado_em)}</td>
              <td className="p-3"><StatusBadge status={statusPt(p.status)} /></td>
              <td className="p-3 font-bold">{dinheiro(p.valor)}</td>
              <td className="p-3">{dinheiro(p.valor_original || p.valor)}</td>
              <td className="p-3">{dinheiro(p.desconto_valor || 0)}</td>
              <td className="p-3">{p.cupom_codigo || "-"}</td>
              <td className="p-3 break-all">{p.payment_id || p.mercado_pago_id || "-"}</td>
            </tr>
          ))}

          {pagamentos.length === 0 && (
            <tr>
              <td className="p-5 text-center text-gray-400" colSpan={7}>
                Nenhum pagamento encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Vazio({ texto, compacto = false }: any) {
  return (
    <div className={`bg-zinc-900 border border-zinc-700 rounded-3xl text-center text-gray-400 ${compacto ? "p-5" : "p-10"}`}>
      {texto}
    </div>
  );
}
