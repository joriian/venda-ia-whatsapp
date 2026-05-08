"use client";

import { useEffect, useMemo, useState } from "react";
import AdminCatalogo from "@/components/admin/AdminCatalogo";
import AdminLogs from "@/components/admin/AdminLogs";
import AdminSaudeAutomacoes from "@/components/admin/AdminSaudeAutomacoes";
import AdminNotificacoes from "@/components/admin/AdminNotificacoes";

type AnyObj = any;

export default function AdminPage() {
  const [admin, setAdmin] = useState<AnyObj>(null);
  const [adminToken, setAdminToken] = useState("");
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [aba, setAba] = useState("resumo");

  const [clientes, setClientes] = useState<AnyObj[]>([]);
  const [instancias, setInstancias] = useState<AnyObj[]>([]);
  const [usuariosAdmin, setUsuariosAdmin] = useState<AnyObj[]>([]);
  const [dashboard, setDashboard] = useState<AnyObj>(null);
  const [servicos, setServicos] = useState<AnyObj[]>([]);
  const [termos, setTermos] = useState<AnyObj>(null);
  const [cupons, setCupons] = useState<AnyObj[]>([]);
  const [permissoes, setPermissoes] = useState<AnyObj[]>([]);

  const [buscaCliente, setBuscaCliente] = useState("");
  const [filtroStatusCliente, setFiltroStatusCliente] = useState("todos");
  const [paginaClientes, setPaginaClientes] = useState(1);

  const [buscaInstancia, setBuscaInstancia] = useState("");
  const [filtroStatusInstancia, setFiltroStatusInstancia] = useState("todos");
  const [paginaInstancias, setPaginaInstancias] = useState(1);

  const [buscaCupom, setBuscaCupom] = useState("");
  const [filtroCupomStatus, setFiltroCupomStatus] = useState("todos");
  const [buscaUsuarioAdmin, setBuscaUsuarioAdmin] = useState("");

  const [novoCupomCodigo, setNovoCupomCodigo] = useState("");
  const [novoCupomDescricao, setNovoCupomDescricao] = useState("");
  const [novoCupomTipo, setNovoCupomTipo] = useState("percentual");
  const [novoCupomValor, setNovoCupomValor] = useState("");
  const [novoCupomLimite, setNovoCupomLimite] = useState("");
  const [novoCupomServicoId, setNovoCupomServicoId] = useState("");
  const [novoCupomPlanoId, setNovoCupomPlanoId] = useState("");
  const [novoCupomDataInicio, setNovoCupomDataInicio] = useState("");
  const [novoCupomDataFim, setNovoCupomDataFim] = useState("");

  const [novoAdminNome, setNovoAdminNome] = useState("");
  const [novoAdminEmail, setNovoAdminEmail] = useState("");
  const [novoAdminSenha, setNovoAdminSenha] = useState("");
  const [novoAdminNivel, setNovoAdminNivel] = useState("suporte");

  const porPagina = 10;

  useEffect(() => {
    iniciarAdmin();
  }, []);

  async function iniciarAdmin() {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    try {
      const res = await fetch("/api/admin/sessao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        limparSessaoAdmin();
        window.location.href = "/admin/login";
        return;
      }

      setAdmin(data.admin);
      setAdminToken(token);
      await carregarTudo(token, data.admin);

      const interval = setInterval(() => {
        carregarDashboard(token);
        carregarInstancias();
      }, 7000);

      return () => clearInterval(interval);
    } catch (error) {
      console.error(error);
      limparSessaoAdmin();
      window.location.href = "/admin/login";
    } finally {
      setCarregandoSessao(false);
    }
  }

  function ehDono() {
    return admin?.nivel === "dono";
  }

  async function carregarTudo(token: string, adminParam = admin) {
    await Promise.allSettled([
      recarregarDados(token),
      carregarDashboard(token),
      carregarInstancias(),
      carregarCatalogo(token),
      carregarCupons(token),
    ]);

    if (adminParam?.nivel === "dono") {
      await Promise.allSettled([
        carregarUsuariosAdmin(token),
        carregarPermissoes(token),
      ]);
    }
  }

  async function recarregarDados(tokenParam?: string) {
    const token = tokenParam || adminToken;
    const res = await fetch("/api/admin/dados", {
      headers: { "x-admin-token": token },
    });

    if (res.ok) {
      const data = await res.json();
      setClientes(data.clientes || []);
    }
  }

  async function carregarDashboard(tokenParam?: string) {
    const token = tokenParam || adminToken;
    const res = await fetch("/api/admin/dashboard", {
      headers: { "x-admin-token": token },
    });

    if (res.ok) setDashboard(await res.json());
  }

  async function carregarInstancias() {
    const res = await fetch("/api/admin/instances");
    const data = await res.json();

    if (Array.isArray(data)) {
      setInstancias(
        [...data].sort((a, b) => {
          if (a.conectado && !b.conectado) return -1;
          if (!a.conectado && b.conectado) return 1;
          return String(a.instance || "").localeCompare(String(b.instance || ""));
        })
      );
    }
  }

  async function carregarCatalogo(tokenParam?: string) {
    const token = tokenParam || adminToken;
    const res = await fetch("/api/admin/catalogo", {
      headers: { "x-admin-token": token },
    });

    const data = await res.json();

    if (res.ok && data.ok) {
      setServicos(data.servicos || []);
      setTermos(data.termos || null);
    }
  }

  async function carregarCupons(tokenParam?: string) {
    const token = tokenParam || adminToken;
    const res = await fetch("/api/admin/cupons", {
      headers: { "x-admin-token": token },
    });

    const data = await res.json();

    if (res.ok && data.ok) setCupons(data.cupons || []);
  }

  async function carregarUsuariosAdmin(tokenParam?: string) {
    const token = tokenParam || adminToken;
    const res = await fetch("/api/admin/usuarios", {
      headers: { "x-admin-token": token },
    });

    const data = await res.json();

    if (res.ok && data.ok) setUsuariosAdmin(data.usuarios || []);
  }

  async function carregarPermissoes(tokenParam?: string) {
    const token = tokenParam || adminToken;
    const res = await fetch("/api/admin/permissoes", {
      headers: { "x-admin-token": token },
    });

    const data = await res.json();

    if (res.ok && data.ok) setPermissoes(data.permissoes || []);
  }

  async function acessarCliente(clienteId: string) {
    const res = await fetch("/api/admin/acessar-cliente", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({ clienteId }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.error || "Erro ao acessar cliente.");
      return;
    }

    window.open(data.url, "_blank");
  }

  async function excluirCliente(cliente: any) {
    if (
      !confirm(
        `Excluir ${cliente.nome}? Isso apaga cadastro, serviços, pagamentos e tenta remover a instância.`
      )
    ) {
      return;
    }

    if (!confirm("Essa ação não pode ser desfeita. Continuar?")) return;

    const res = await fetch("/api/admin/excluir-cliente", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({ cliente_id: cliente.id }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.detalhe || data.error || "Erro ao excluir cliente.");
      return;
    }

    alert("Cliente excluído com sucesso.");
    await carregarTudo(adminToken, admin);
  }

  async function acaoCliente(id: string, acao: string) {
    const res = await fetch("/api/admin/cliente-acao", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({ cliente_id: id, acao }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.detalhe || data.error || "Erro ao executar ação");
      return;
    }

    if (acao === "gerar_link" && data.link) {
      alert(`Link de pagamento:\n${data.link}`);
    } else {
      alert("Ação realizada com sucesso");
    }

    await carregarTudo(adminToken, admin);
  }

  async function controlarInstanciaAdmin(
    instanceName: string,
    acao: "status" | "qrcode" | "reiniciar" | "desconectar"
  ) {
    if (!instanceName) {
      alert("Instância inválida.");
      return;
    }

    try {
      const res = await fetch("/api/admin/evolution", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          instance_name: instanceName,
          acao,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.detalhe || data.error || "Erro ao controlar instância.");
        return;
      }

      await carregarInstancias();
      await recarregarDados();

      if (acao === "status") alert("Status atualizado.");
      if (acao === "qrcode") alert("QR Code solicitado.");
      if (acao === "reiniciar") alert("Instância reiniciada.");
      if (acao === "desconectar") alert("Instância desconectada.");
    } catch (error) {
      console.error(error);
      alert("Erro ao controlar instância.");
    }
  }

  async function salvarServico(dados: any) {
    const res = await fetch("/api/admin/catalogo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify(dados),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.detalhe || data.error || "Erro ao salvar serviço.");
      return;
    }

    alert("Serviço salvo com sucesso.");
    await carregarCatalogo();
  }

  async function salvarPlano(dados: any) {
    const res = await fetch("/api/admin/catalogo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify(dados),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.detalhe || data.error || "Erro ao salvar plano.");
      return;
    }

    alert("Plano salvo com sucesso.");
    await carregarCatalogo();
  }

  async function editarServico(servico: any) {
    const nome = prompt("Nome do serviço:", servico?.nome || "");
    if (!nome) return;

    const slug = prompt("Slug do serviço:", servico?.slug || nome.toLowerCase().replaceAll(" ", "-"));
    if (!slug) return;

    const descricao = prompt("Descrição:", servico?.descricao || "") || "";
    const workflowId = prompt("Workflow ID do n8n:", servico?.workflow_id || "") || "";
    const webhookUrl = prompt("Webhook URL do n8n:", servico?.webhook_url || "") || "";
    const workflowTipo = prompt("Tipo do workflow:", servico?.workflow_tipo || "whatsapp") || "whatsapp";
    const eventosTexto =
      prompt(
        "Eventos Evolution separados por vírgula:",
        Array.isArray(servico?.evolution_events)
          ? servico.evolution_events.join(",")
          : "MESSAGES_UPSERT,CONNECTION_UPDATE"
      ) || "MESSAGES_UPSERT,CONNECTION_UPDATE";

    const ativo = confirm("Deixar este serviço ATIVO?");
    const webhookEnabled = confirm("Habilitar webhook Evolution para este serviço?");
    const webhookBase64 = confirm("Habilitar webhook base64?");

    await salvarServico({
      acao: servico?.id ? "atualizar_servico" : "criar_servico",
      id: servico?.id,
      nome,
      slug,
      descricao,
      ativo,
      workflow_id: workflowId,
      webhook_url: webhookUrl,
      workflow_tipo: workflowTipo,
      evolution_webhook_enabled: webhookEnabled,
      evolution_webhook_base64: webhookBase64,
      evolution_events: eventosTexto
        .split(",")
        .map((e) => e.trim().toUpperCase())
        .filter(Boolean),
      ordem: servico?.ordem || 0,
    });
  }

  async function editarPlano(plano: any) {
    const servicoId =
      plano?.servico_id ||
      prompt(
        "ID do serviço para este plano:",
        servicos[0]?.id || ""
      );

    if (!servicoId) return;

    const nome = prompt("Nome do plano:", plano?.nome || "");
    if (!nome) return;

    const descricao = prompt("Descrição do plano:", plano?.descricao || "") || "";
    const valor = prompt("Valor do plano:", String(plano?.valor || ""));
    if (!valor) return;

    const meses = prompt("Quantidade de meses:", String(plano?.meses || 1));
    if (!meses) return;

    const ativo = confirm("Deixar este plano ATIVO?");
    const destaque = confirm("Marcar este plano como DESTAQUE?");

    await salvarPlano({
      acao: plano?.id ? "atualizar_plano" : "criar_plano",
      id: plano?.id,
      servico_id: servicoId,
      nome,
      descricao,
      valor,
      meses,
      ativo,
      destaque,
      ordem: plano?.ordem || 0,
    });
  }

  async function excluirServico(id: string) {
    alert("Por segurança, exclusão definitiva de serviço ainda não foi liberada. Desative o serviço editando e marcando como inativo.");
  }

  async function excluirPlano(id: string) {
    alert("Por segurança, exclusão definitiva de plano ainda não foi liberada. Edite o plano e marque como inativo.");
  }

  async function criarCupom() {
    if (!novoCupomCodigo || !novoCupomValor) {
      alert("Informe código e valor do cupom.");
      return;
    }

    const res = await fetch("/api/admin/cupons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({
        acao: "criar",
        codigo: novoCupomCodigo,
        descricao: novoCupomDescricao,
        tipo: novoCupomTipo,
        valor: novoCupomValor,
        limite_usos: novoCupomLimite || null,
        servico_id: novoCupomServicoId || null,
        plano_id: novoCupomPlanoId || null,
        data_inicio: novoCupomDataInicio || null,
        data_fim: novoCupomDataFim || null,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.detalhe || data.error || "Erro ao criar cupom.");
      return;
    }

    setNovoCupomCodigo("");
    setNovoCupomDescricao("");
    setNovoCupomTipo("percentual");
    setNovoCupomValor("");
    setNovoCupomLimite("");
    setNovoCupomServicoId("");
    setNovoCupomPlanoId("");
    setNovoCupomDataInicio("");
    setNovoCupomDataFim("");

    alert("Cupom criado.");
    await carregarCupons();
  }

  async function atualizarCupom(cupom: any) {
    const res = await fetch("/api/admin/cupons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({ acao: "atualizar", ...cupom }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.detalhe || data.error || "Erro ao atualizar cupom.");
      return;
    }

    alert("Cupom atualizado.");
    await carregarCupons();
  }

  async function criarUsuarioAdmin() {
    if (!novoAdminNome || !novoAdminEmail || !novoAdminSenha) {
      alert("Preencha nome, email e senha.");
      return;
    }

    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({
        acao: "criar",
        nome: novoAdminNome,
        email: novoAdminEmail,
        senha: novoAdminSenha,
        nivel: novoAdminNivel,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.error || "Erro ao criar usuário.");
      return;
    }

    setNovoAdminNome("");
    setNovoAdminEmail("");
    setNovoAdminSenha("");
    setNovoAdminNivel("suporte");

    alert("Usuário criado.");
    await carregarUsuariosAdmin();
  }

  async function atualizarUsuarioAdmin(usuario: any) {
    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({
        acao: "atualizar",
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        nivel: usuario.nivel,
        ativo: usuario.ativo,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.error || "Erro ao atualizar usuário.");
      return;
    }

    alert("Usuário atualizado.");
    await carregarUsuariosAdmin();
  }

  async function alterarSenhaAdmin(usuario: any) {
    const novaSenha = prompt(
      "Digite a nova senha. Precisa ter maiúscula, minúscula, número e caractere especial:"
    );

    if (!novaSenha) return;

    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({
        acao: "alterar_senha",
        id: usuario.id,
        novaSenha,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.error || "Erro ao alterar senha.");
      return;
    }

    alert("Senha alterada.");
    await carregarUsuariosAdmin();
  }

  async function salvarPermissao(permissao: any) {
    const res = await fetch("/api/admin/permissoes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify(permissao),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.error || "Erro ao salvar permissão.");
      return;
    }

    alert("Permissões salvas.");
    await carregarPermissoes();
  }

  async function sair() {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: adminToken }),
      });
    } catch {}

    limparSessaoAdmin();
    window.location.href = "/admin/login";
  }

  function limparSessaoAdmin() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminNome");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("adminNivel");
    localStorage.removeItem("adminSessaoExpira");
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
    const mapa: AnyObj = {
      ativo: "Ativo",
      vencido: "Vencido",
      aguardando_pagamento: "Aguardando pagamento",
      approved: "Aprovado",
      pending: "Pendente",
      rejected: "Recusado",
      cancelado: "Cancelado",
      open: "Conectado",
      connected: "Conectado",
      connecting: "Conectando",
      close: "Desconectado",
      desconectado: "Desconectado",
    };

    return mapa[status] || status || "-";
  }

  const planosTodos = useMemo(
    () =>
      servicos.flatMap((servico) =>
        (servico.planos || []).map((plano: any) => ({
          ...plano,
          servico_nome: servico.nome,
          servico_id: plano.servico_id || servico.id,
        }))
      ),
    [servicos]
  );

  const clientesFiltrados = useMemo(() => {
    const busca = buscaCliente.toLowerCase().trim();

    return clientes.filter((cliente) => {
      const servicosTexto = (cliente.servicos_cliente || [])
        .map(
          (s: any) =>
            `${s.servicos_ia?.nome || ""} ${s.planos?.nome || ""} ${s.status || ""}`
        )
        .join(" ");

      const texto = [
        cliente.nome,
        cliente.email,
        cliente.telefone,
        cliente.status,
        cliente.plano_id,
        cliente.id,
        servicosTexto,
      ]
        .join(" ")
        .toLowerCase();

      const bateBusca = !busca || texto.includes(busca);
      const bateStatus =
        filtroStatusCliente === "todos" || cliente.status === filtroStatusCliente;

      return bateBusca && bateStatus;
    });
  }, [clientes, buscaCliente, filtroStatusCliente]);

  const totalPaginasClientes = Math.max(
    1,
    Math.ceil(clientesFiltrados.length / porPagina)
  );

  const clientesPaginados = clientesFiltrados.slice(
    (paginaClientes - 1) * porPagina,
    paginaClientes * porPagina
  );

  const cuponsFiltrados = useMemo(() => {
    const busca = buscaCupom.toLowerCase().trim();

    return cupons.filter((cupom) => {
      const texto = [
        cupom.codigo,
        cupom.descricao,
        cupom.tipo,
        cupom.valor,
        cupom.ativo ? "ativo" : "inativo",
      ]
        .join(" ")
        .toLowerCase();

      const bateBusca = !busca || texto.includes(busca);
      const bateStatus =
        filtroCupomStatus === "todos" ||
        (filtroCupomStatus === "ativos" && cupom.ativo) ||
        (filtroCupomStatus === "inativos" && !cupom.ativo);

      return bateBusca && bateStatus;
    });
  }, [cupons, buscaCupom, filtroCupomStatus]);

  const usuariosAdminFiltrados = useMemo(() => {
    const busca = buscaUsuarioAdmin.toLowerCase().trim();

    if (!busca) return [];

    return usuariosAdmin.filter((u) =>
      [u.nome, u.email, u.nivel, u.ativo ? "ativo" : "inativo"]
        .join(" ")
        .toLowerCase()
        .includes(busca)
    );
  }, [usuariosAdmin, buscaUsuarioAdmin]);

  const instanciasFiltradas = useMemo(() => {
    const busca = buscaInstancia.toLowerCase().trim();

    return instancias.filter((instancia) => {
      const texto = [
        instancia.instance,
        instancia.instance_name,
        instancia.status,
        instancia.numero,
        instancia.nome,
        instancia.cliente_nome,
        instancia.cliente_email,
        instancia.cliente_telefone,
        instancia.servico_nome,
        instancia.workflow_id,
        instancia.webhook_url,
      ]
        .join(" ")
        .toLowerCase();

      const bateBusca = !busca || texto.includes(busca);
      const bateStatus =
        filtroStatusInstancia === "todos" ||
        (filtroStatusInstancia === "conectado" && instancia.conectado) ||
        (filtroStatusInstancia === "desconectado" && !instancia.conectado);

      return bateBusca && bateStatus;
    });
  }, [instancias, buscaInstancia, filtroStatusInstancia]);

  const totalPaginasInstancias = Math.max(
    1,
    Math.ceil(instanciasFiltradas.length / porPagina)
  );

  const instanciasPaginadas = instanciasFiltradas.slice(
    (paginaInstancias - 1) * porPagina,
    paginaInstancias * porPagina
  );

  useEffect(() => setPaginaClientes(1), [buscaCliente, filtroStatusCliente]);
  useEffect(() => setPaginaInstancias(1), [buscaInstancia, filtroStatusInstancia]);

  if (carregandoSessao) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Validando sessão...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Painel Admin</h1>
          <p className="text-gray-400 text-sm mt-1">
            Logado como {admin?.nome} — nível: {admin?.nivel}
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => carregarTudo(adminToken, admin)}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-5 py-3 rounded-lg font-semibold"
          >
            Atualizar painel
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
        <Aba ativa={aba === "notificacoes"} onClick={() => setAba("notificacoes")}>Notificações</Aba>
        <Aba ativa={aba === "catalogo"} onClick={() => setAba("catalogo")}>Serviços e planos</Aba>
        <Aba ativa={aba === "cupons"} onClick={() => setAba("cupons")}>Cupons</Aba>
        <Aba ativa={aba === "clientes"} onClick={() => setAba("clientes")}>Clientes</Aba>
        <Aba ativa={aba === "instancias"} onClick={() => setAba("instancias")}>Instâncias</Aba>
        <Aba ativa={aba === "logs"} onClick={() => setAba("logs")}>Logs</Aba>
        <Aba ativa={aba === "saude"} onClick={() => setAba("saude")}>Saúde</Aba>
        {ehDono() && <Aba ativa={aba === "usuarios"} onClick={() => setAba("usuarios")}>Usuários admin</Aba>}
        {ehDono() && <Aba ativa={aba === "permissoes"} onClick={() => setAba("permissoes")}>Permissões</Aba>}
      </nav>

      {aba === "resumo" && (
        <section>
          {dashboard && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
              <Card titulo="Receita total" valor={dinheiro(dashboard.receita_total)} />
              <Card titulo="Receita do mês" valor={dinheiro(dashboard.receita_mes)} />
              <Card titulo="Clientes ativos" valor={dashboard.ativos} />
              <Card titulo="Vencendo em 3 dias" valor={dashboard.vencendo} />
              <Card titulo="Clientes vencidos" valor={dashboard.vencidos} />
              <Card titulo="Aguardando pagamento" valor={dashboard.aguardando} />
              <Card titulo="Total de clientes" valor={dashboard.clientes_total} />
              <Card titulo="Pagamentos" valor={dashboard.pagamentos_total} />
            </div>
          )}
        </section>
      )}

      {aba === "notificacoes" && (
        <AdminNotificacoes adminToken={adminToken} />
      )}

      {aba === "catalogo" && (
        <AdminCatalogo
          servicos={servicos}
          planos={planosTodos}
          salvarServico={salvarServico}
          salvarPlano={salvarPlano}
          editarServico={editarServico}
          editarPlano={editarPlano}
          excluirServico={excluirServico}
          excluirPlano={excluirPlano}
        />
      )}

      {aba === "clientes" && (
        <section className="mb-10">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold">Clientes</h2>
              <p className="text-gray-400 text-sm">
                Exibindo {clientesPaginados.length} de {clientesFiltrados.length} clientes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full xl:w-auto">
              <input
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                placeholder="Pesquisar cliente, email, telefone, serviço..."
                className="p-3 rounded bg-zinc-800 border border-zinc-700 min-w-[320px]"
              />

              <select
                value={filtroStatusCliente}
                onChange={(e) => setFiltroStatusCliente(e.target.value)}
                className="p-3 rounded bg-zinc-800 border border-zinc-700"
              >
                <option value="todos">Todos os status</option>
                <option value="ativo">Ativo</option>
                <option value="vencido">Vencido</option>
                <option value="aguardando_pagamento">Aguardando pagamento</option>
              </select>
            </div>
          </div>

          <ClientesCards
            clientes={clientesPaginados}
            acaoCliente={acaoCliente}
            acessarCliente={acessarCliente}
            excluirCliente={excluirCliente}
            statusPt={statusPt}
            dataPt={dataPt}
          />

          <Paginacao
            pagina={paginaClientes}
            totalPaginas={totalPaginasClientes}
            setPagina={setPaginaClientes}
          />
        </section>
      )}

      {aba === "cupons" && (
        <CuponsSection
          cupons={cupons}
          setCupons={setCupons}
          cuponsFiltrados={cuponsFiltrados}
          servicos={servicos}
          planosTodos={planosTodos}
          buscaCupom={buscaCupom}
          setBuscaCupom={setBuscaCupom}
          filtroCupomStatus={filtroCupomStatus}
          setFiltroCupomStatus={setFiltroCupomStatus}
          novoCupomCodigo={novoCupomCodigo}
          setNovoCupomCodigo={setNovoCupomCodigo}
          novoCupomDescricao={novoCupomDescricao}
          setNovoCupomDescricao={setNovoCupomDescricao}
          novoCupomTipo={novoCupomTipo}
          setNovoCupomTipo={setNovoCupomTipo}
          novoCupomValor={novoCupomValor}
          setNovoCupomValor={setNovoCupomValor}
          novoCupomLimite={novoCupomLimite}
          setNovoCupomLimite={setNovoCupomLimite}
          novoCupomServicoId={novoCupomServicoId}
          setNovoCupomServicoId={setNovoCupomServicoId}
          novoCupomPlanoId={novoCupomPlanoId}
          setNovoCupomPlanoId={setNovoCupomPlanoId}
          novoCupomDataInicio={novoCupomDataInicio}
          setNovoCupomDataInicio={setNovoCupomDataInicio}
          novoCupomDataFim={novoCupomDataFim}
          setNovoCupomDataFim={setNovoCupomDataFim}
          criarCupom={criarCupom}
          atualizarCupom={atualizarCupom}
        />
      )}

      {aba === "instancias" && (
        <section>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold">Instâncias em tempo real</h2>
              <p className="text-gray-400 text-sm">
                Exibindo {instanciasPaginadas.length} de {instanciasFiltradas.length} instâncias.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full md:w-auto">
              <input
                value={buscaInstancia}
                onChange={(e) => setBuscaInstancia(e.target.value)}
                placeholder="Pesquisar instância, número, nome..."
                className="p-3 rounded bg-zinc-800 border border-zinc-700 min-w-[280px]"
              />

              <select
                value={filtroStatusInstancia}
                onChange={(e) => setFiltroStatusInstancia(e.target.value)}
                className="p-3 rounded bg-zinc-800 border border-zinc-700"
              >
                <option value="todos">Todas</option>
                <option value="conectado">Conectadas</option>
                <option value="desconectado">Desconectadas</option>
              </select>
            </div>
          </div>

          <TabelaInstancias
            instancias={instanciasPaginadas}
            controlarInstanciaAdmin={controlarInstanciaAdmin}
          />

          <Paginacao
            pagina={paginaInstancias}
            totalPaginas={totalPaginasInstancias}
            setPagina={setPaginaInstancias}
          />
        </section>
      )}

      {aba === "logs" && (
        <AdminLogs adminToken={adminToken} />
      )}

      {aba === "saude" && (
        <AdminSaudeAutomacoes adminToken={adminToken} />
      )}

      {aba === "usuarios" && ehDono() && (
        <UsuariosSection
          usuarios={usuariosAdminFiltrados}
          buscaUsuarioAdmin={buscaUsuarioAdmin}
          setBuscaUsuarioAdmin={setBuscaUsuarioAdmin}
          novoAdminNome={novoAdminNome}
          setNovoAdminNome={setNovoAdminNome}
          novoAdminEmail={novoAdminEmail}
          setNovoAdminEmail={setNovoAdminEmail}
          novoAdminSenha={novoAdminSenha}
          setNovoAdminSenha={setNovoAdminSenha}
          novoAdminNivel={novoAdminNivel}
          setNovoAdminNivel={setNovoAdminNivel}
          criarUsuarioAdmin={criarUsuarioAdmin}
          atualizarUsuarioAdmin={atualizarUsuarioAdmin}
          alterarSenhaAdmin={alterarSenhaAdmin}
        />
      )}

      {aba === "permissoes" && ehDono() && (
        <PermissoesSection
          permissoes={permissoes}
          setPermissoes={setPermissoes}
          salvarPermissao={salvarPermissao}
        />
      )}
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

function Card({ titulo, valor }: { titulo: string; valor: any }) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <p className="text-gray-400 text-sm">{titulo}</p>
      <p className="text-2xl font-bold mt-2">{valor}</p>
    </div>
  );
}

function StatusBadge({ status }: any) {
  const ativo = status === "Ativo" || status === "Aprovado" || status === "Conectado";
  const aguardando = status === "Aguardando pagamento" || status === "Pendente";

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

function InfoMini({ label, value }: any) {
  return (
    <div className="bg-zinc-800/70 border border-zinc-700 rounded-lg p-3">
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="font-semibold break-all text-sm">{value || "-"}</p>
    </div>
  );
}

function ClientesCards({
  clientes,
  acaoCliente,
  acessarCliente,
  excluirCliente,
  statusPt,
  dataPt,
}: any) {
  function dinheiro(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <div className="grid gap-4">
      {clientes.map((cliente: any) => {
        const pagamentos = cliente.pagamentos_cliente || [];
        const servicos = cliente.servicos_cliente || [];

        return (
          <div key={cliente.id} className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4">
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                  <h3 className="text-lg font-bold">{cliente.nome}</h3>
                  <StatusBadge status={statusPt(cliente.status)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                  <InfoMini label="Email" value={cliente.email} />
                  <InfoMini label="Telefone" value={cliente.telefone || "-"} />
                  <InfoMini label="Expira" value={dataPt(cliente.data_expiracao)} />
                  <InfoMini label="Cliente ID" value={cliente.id} />
                </div>
              </div>

              <div className="flex gap-2 flex-wrap xl:justify-end">
                <button onClick={() => acessarCliente(cliente.id)} className="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded font-bold text-sm">Entrar</button>
                <button onClick={() => acaoCliente(cliente.id, "bloquear")} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded font-bold text-sm">Bloquear</button>
                <button onClick={() => acaoCliente(cliente.id, "reativar")} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded font-bold text-sm">Reativar</button>
                <button onClick={() => acaoCliente(cliente.id, "gerar_link")} className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded font-bold text-sm">Link</button>
                <button onClick={() => acaoCliente(cliente.id, "cobrar")} className="bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded font-bold text-sm">Cobrar</button>
                <button onClick={() => excluirCliente(cliente)} className="bg-zinc-700 hover:bg-red-800 border border-red-700 px-3 py-2 rounded font-bold text-sm">Excluir</button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h4 className="font-bold text-sm">Serviços adquiridos</h4>
                  <span className="text-xs text-gray-400">{servicos.length} serviço(s)</span>
                </div>

                <div className="grid gap-3">
                  {servicos.map((servico: any) => (
                    <div key={servico.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-3">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm">{servico.servicos_ia?.nome || "Serviço"}</p>
                          <p className="text-gray-400 text-xs">Plano: {servico.planos?.nome || servico.plano_id || "-"}</p>
                        </div>

                        <StatusBadge status={statusPt(servico.status)} />
                      </div>
                    </div>
                  ))}

                  {servicos.length === 0 && <p className="text-gray-400 text-sm">Nenhum serviço vinculado.</p>}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h4 className="font-bold text-sm">Últimos pagamentos</h4>
                  <span className="text-xs text-gray-400">máx. 5</span>
                </div>

                <div className="grid gap-3">
                  {pagamentos.map((pagamento: any) => (
                    <div key={pagamento.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-3">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm">{dinheiro(pagamento.valor)}</p>
                          <p className="text-gray-400 text-xs">{dataPt(pagamento.criado_em || pagamento.created_at)}</p>
                        </div>

                        <StatusBadge status={statusPt(pagamento.status)} />
                      </div>

                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-400">
                        <p className="break-all">Pagamento: {pagamento.payment_id || pagamento.mercado_pago_id || "-"}</p>
                        <p>Cupom: {pagamento.cupom_codigo || "-"}</p>
                      </div>
                    </div>
                  ))}

                  {pagamentos.length === 0 && <p className="text-gray-400 text-sm">Nenhum pagamento encontrado.</p>}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {clientes.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 text-center text-gray-400">
          Nenhum cliente encontrado.
        </div>
      )}
    </div>
  );
}

function CuponsSection(props: any) {
  const {
    cupons,
    setCupons,
    cuponsFiltrados,
    servicos,
    planosTodos,
    buscaCupom,
    setBuscaCupom,
    filtroCupomStatus,
    setFiltroCupomStatus,
    novoCupomCodigo,
    setNovoCupomCodigo,
    novoCupomDescricao,
    setNovoCupomDescricao,
    novoCupomTipo,
    setNovoCupomTipo,
    novoCupomValor,
    setNovoCupomValor,
    novoCupomLimite,
    setNovoCupomLimite,
    novoCupomServicoId,
    setNovoCupomServicoId,
    novoCupomPlanoId,
    setNovoCupomPlanoId,
    novoCupomDataInicio,
    setNovoCupomDataInicio,
    novoCupomDataFim,
    setNovoCupomDataFim,
    criarCupom,
    atualizarCupom,
  } = props;

  return (
    <section className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-4">Cupons de desconto</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <input value={buscaCupom} onChange={(e) => setBuscaCupom(e.target.value)} placeholder="Pesquisar cupom..." className="p-3 rounded bg-zinc-800 border border-zinc-700" />
        <select value={filtroCupomStatus} onChange={(e) => setFiltroCupomStatus(e.target.value)} className="p-3 rounded bg-zinc-800 border border-zinc-700">
          <option value="todos">Todos</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
        </select>
      </div>

      <div className="border border-zinc-700 rounded-xl p-4 mb-6">
        <h3 className="font-bold mb-3">Criar cupom</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input value={novoCupomCodigo} onChange={(e) => setNovoCupomCodigo(e.target.value.toUpperCase())} placeholder="Código" className="p-3 rounded bg-zinc-800 border border-zinc-700" />

          <select value={novoCupomTipo} onChange={(e) => setNovoCupomTipo(e.target.value)} className="p-3 rounded bg-zinc-800 border border-zinc-700">
            <option value="percentual">Percentual (%)</option>
            <option value="fixo">Valor fixo (R$)</option>
          </select>

          <input value={novoCupomValor} onChange={(e) => setNovoCupomValor(e.target.value)} placeholder="Valor" className="p-3 rounded bg-zinc-800 border border-zinc-700" />
          <input value={novoCupomLimite} onChange={(e) => setNovoCupomLimite(e.target.value)} placeholder="Limite de usos" className="p-3 rounded bg-zinc-800 border border-zinc-700" />

          <select value={novoCupomServicoId} onChange={(e) => { setNovoCupomServicoId(e.target.value); setNovoCupomPlanoId(""); }} className="p-3 rounded bg-zinc-800 border border-zinc-700">
            <option value="">Todos os serviços</option>
            {servicos.map((s: any) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>

          <select value={novoCupomPlanoId} onChange={(e) => setNovoCupomPlanoId(e.target.value)} className="p-3 rounded bg-zinc-800 border border-zinc-700">
            <option value="">Todos os planos</option>
            {planosTodos
              .filter((p: any) => !novoCupomServicoId || p.servico_id === novoCupomServicoId)
              .map((p: any) => <option key={p.id} value={p.id}>{p.servico_nome} - {p.nome}</option>)}
          </select>

          <input type="datetime-local" value={novoCupomDataInicio} onChange={(e) => setNovoCupomDataInicio(e.target.value)} className="p-3 rounded bg-zinc-800 border border-zinc-700" />
          <input type="datetime-local" value={novoCupomDataFim} onChange={(e) => setNovoCupomDataFim(e.target.value)} className="p-3 rounded bg-zinc-800 border border-zinc-700" />

          <textarea value={novoCupomDescricao} onChange={(e) => setNovoCupomDescricao(e.target.value)} placeholder="Descrição" className="md:col-span-3 p-3 rounded bg-zinc-800 border border-zinc-700 min-h-20" />

          <button onClick={criarCupom} className="bg-green-600 hover:bg-green-700 rounded font-bold">
            Criar cupom
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-zinc-700 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-700 text-left bg-zinc-800">
              <th className="p-3">Código</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Usos</th>
              <th className="p-3">Ativo</th>
              <th className="p-3">Ação</th>
            </tr>
          </thead>

          <tbody>
            {cuponsFiltrados.map((cupom: any) => {
              const i = cupons.findIndex((c: any) => c.id === cupom.id);

              return (
                <tr key={cupom.id} className="border-b border-zinc-800">
                  <td className="p-3">
                    <input value={cupom.codigo} onChange={(e) => { const n = [...cupons]; n[i].codigo = e.target.value.toUpperCase(); setCupons(n); }} className="p-2 rounded bg-zinc-900 border border-zinc-700" />
                  </td>

                  <td className="p-3">
                    <select value={cupom.tipo} onChange={(e) => { const n = [...cupons]; n[i].tipo = e.target.value; setCupons(n); }} className="p-2 rounded bg-zinc-900 border border-zinc-700">
                      <option value="percentual">%</option>
                      <option value="fixo">R$</option>
                    </select>
                  </td>

                  <td className="p-3">
                    <input value={cupom.valor} onChange={(e) => { const n = [...cupons]; n[i].valor = e.target.value; setCupons(n); }} className="p-2 rounded bg-zinc-900 border border-zinc-700 w-24" />
                  </td>

                  <td className="p-3">{cupom.usos_atuais || 0} / {cupom.limite_usos || "∞"}</td>

                  <td className="p-3">
                    <input type="checkbox" checked={cupom.ativo} onChange={(e) => { const n = [...cupons]; n[i].ativo = e.target.checked; setCupons(n); }} />
                  </td>

                  <td className="p-3">
                    <button onClick={() => atualizarCupom(cupons[i])} className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded">
                      Salvar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UsuariosSection(props: any) {
  const {
    usuarios,
    buscaUsuarioAdmin,
    setBuscaUsuarioAdmin,
    novoAdminNome,
    setNovoAdminNome,
    novoAdminEmail,
    setNovoAdminEmail,
    novoAdminSenha,
    setNovoAdminSenha,
    novoAdminNivel,
    setNovoAdminNivel,
    criarUsuarioAdmin,
    atualizarUsuarioAdmin,
    alterarSenhaAdmin,
  } = props;

  return (
    <section className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-4">Usuários administrativos</h2>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
        <input value={novoAdminNome} onChange={(e) => setNovoAdminNome(e.target.value)} placeholder="Nome" className="p-3 rounded bg-zinc-800 border border-zinc-700" />
        <input value={novoAdminEmail} onChange={(e) => setNovoAdminEmail(e.target.value)} placeholder="Email" className="p-3 rounded bg-zinc-800 border border-zinc-700" />
        <input type="password" value={novoAdminSenha} onChange={(e) => setNovoAdminSenha(e.target.value)} placeholder="Senha forte" className="p-3 rounded bg-zinc-800 border border-zinc-700" />

        <select value={novoAdminNivel} onChange={(e) => setNovoAdminNivel(e.target.value)} className="p-3 rounded bg-zinc-800 border border-zinc-700">
          <option value="suporte">Suporte</option>
          <option value="financeiro">Financeiro</option>
          <option value="admin">Admin</option>
          <option value="dono">Dono</option>
        </select>

        <button onClick={criarUsuarioAdmin} className="bg-green-600 hover:bg-green-700 py-3 rounded font-bold">
          Criar usuário
        </button>
      </div>

      <input value={buscaUsuarioAdmin} onChange={(e) => setBuscaUsuarioAdmin(e.target.value)} placeholder="Buscar usuário admin para exibir..." className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 mb-4" />

      {buscaUsuarioAdmin.trim() && (
        <div className="overflow-x-auto border border-zinc-700 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left bg-zinc-800">
                <th className="p-3">Nome</th>
                <th className="p-3">Email</th>
                <th className="p-3">Nível</th>
                <th className="p-3">Ativo</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>

            <tbody>
              {usuarios.map((u: any) => (
                <tr key={u.id} className="border-b border-zinc-800">
                  <td className="p-3">{u.nome}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.nivel}</td>
                  <td className="p-3">{u.ativo ? "Sim" : "Não"}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => atualizarUsuarioAdmin(u)} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded">Salvar</button>
                      <button onClick={() => alterarSenhaAdmin(u)} className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded">Senha</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PermissoesSection({ permissoes, setPermissoes, salvarPermissao }: any) {
  const campos = [
    "pode_ver_resumo",
    "pode_gerenciar_catalogo",
    "pode_gerenciar_cupons",
    "pode_ver_clientes",
    "pode_bloquear_clientes",
    "pode_cobrar_clientes",
    "pode_ver_instancias",
    "pode_gerenciar_admins",
    "pode_acessar_cliente",
  ];

  return (
    <section className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-4">Permissões por nível</h2>

      <div className="overflow-x-auto border border-zinc-700 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-800 border-b border-zinc-700 text-left">
              <th className="p-3">Nível</th>
              {campos.map((c) => (
                <th key={c} className="p-3">
                  {c.replaceAll("pode_", "").replaceAll("_", " ")}
                </th>
              ))}
              <th className="p-3">Ação</th>
            </tr>
          </thead>

          <tbody>
            {permissoes.map((p: any, index: number) => (
              <tr key={p.id} className="border-b border-zinc-800">
                <td className="p-3 font-bold">{p.nivel}</td>

                {campos.map((campo) => (
                  <td key={campo} className="p-3">
                    <input
                      type="checkbox"
                      checked={Boolean(p[campo])}
                      disabled={p.nivel === "dono"}
                      onChange={(e) => {
                        const n = [...permissoes];
                        n[index][campo] = e.target.checked;
                        setPermissoes(n);
                      }}
                    />
                  </td>
                ))}

                <td className="p-3">
                  <button disabled={p.nivel === "dono"} onClick={() => salvarPermissao(p)} className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 px-3 py-2 rounded">
                    Salvar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TabelaInstancias({ instancias, controlarInstanciaAdmin }: any) {
  function nomeInstancia(i: any) {
    return i.instance || i.instance_name || "";
  }

  return (
    <div className="grid gap-4">
      {instancias.map((i: any, index: number) => {
        const instanceName = nomeInstancia(i);

        return (
          <div
            key={instanceName || index}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4"
          >
            <div className="flex flex-col 2xl:flex-row 2xl:items-start 2xl:justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span
                    className={`px-3 py-1 rounded-full border text-xs font-bold ${
                      i.conectado
                        ? "bg-green-900/40 text-green-400 border-green-700"
                        : "bg-red-900/40 text-red-400 border-red-700"
                    }`}
                  >
                    {i.conectado ? "Conectada" : "Desconectada"}
                  </span>

                  <h3 className="text-lg font-bold break-all">
                    {instanceName || "Instância sem nome"}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  <InfoMini label="Cliente" value={i.cliente_nome || i.cliente || "-"} />
                  <InfoMini label="Serviço" value={i.servico_nome || i.servico || "-"} />
                  <InfoMini label="Número" value={i.numero || "-"} />
                  <InfoMini label="Estado" value={i.status || "-"} />
                  <InfoMini label="Nome WhatsApp" value={i.nome || "-"} />
                  <InfoMini label="Workflow" value={i.workflow_id || "-"} />
                  <InfoMini label="Webhook" value={i.webhook_url || "-"} />
                  <InfoMini label="ID instância" value={instanceName || "-"} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-1 gap-2 min-w-[190px]">
                <button
                  onClick={() => controlarInstanciaAdmin(instanceName, "status")}
                  className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-xl font-bold text-sm"
                >
                  Atualizar
                </button>

                <button
                  onClick={() => controlarInstanciaAdmin(instanceName, "qrcode")}
                  className="bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded-xl font-bold text-sm"
                >
                  QR Code
                </button>

                <button
                  onClick={() => controlarInstanciaAdmin(instanceName, "reiniciar")}
                  className="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded-xl font-bold text-sm"
                >
                  Reiniciar
                </button>

                <button
                  onClick={() => {
                    if (confirm("Deseja realmente desconectar esta instância?")) {
                      controlarInstanciaAdmin(instanceName, "desconectar");
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-xl font-bold text-sm"
                >
                  Desconectar
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {instancias.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 text-center text-gray-400">
          Nenhuma instância encontrada.
        </div>
      )}
    </div>
  );
}

function Paginacao({
  pagina,
  totalPaginas,
  setPagina,
}: {
  pagina: number;
  totalPaginas: number;
  setPagina: (pagina: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 mt-5">
      <button
        onClick={() => setPagina(Math.max(1, pagina - 1))}
        disabled={pagina <= 1}
        className="px-4 py-2 rounded bg-zinc-800 border border-zinc-700 disabled:opacity-40"
      >
        Anterior
      </button>

      <span className="text-gray-300 text-sm">
        Página {pagina} de {totalPaginas}
      </span>

      <button
        onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))}
        disabled={pagina >= totalPaginas}
        className="px-4 py-2 rounded bg-zinc-800 border border-zinc-700 disabled:opacity-40"
      >
        Próxima
      </button>
    </div>
  );
}
