"use client";

import { useEffect, useMemo, useState } from "react";

export default function AdminPage() {
  const [admin, setAdmin] = useState<any>(null);
  const [adminToken, setAdminToken] = useState("");
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [aba, setAba] = useState("resumo");

  const [clientes, setClientes] = useState<any[]>([]);
  const [instancias, setInstancias] = useState<any[]>([]);
  const [usuariosAdmin, setUsuariosAdmin] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [servicos, setServicos] = useState<any[]>([]);
  const [termos, setTermos] = useState<any>(null);
  const [cupons, setCupons] = useState<any[]>([]);
  const [permissoes, setPermissoes] = useState<any[]>([]);

  const [buscaCliente, setBuscaCliente] = useState("");
  const [filtroStatusCliente, setFiltroStatusCliente] = useState("todos");
  const [paginaClientes, setPaginaClientes] = useState(1);

  const [buscaInstancia, setBuscaInstancia] = useState("");
  const [filtroStatusInstancia, setFiltroStatusInstancia] = useState("todos");
  const [paginaInstancias, setPaginaInstancias] = useState(1);

  const [buscaUsuarioAdmin, setBuscaUsuarioAdmin] = useState("");
  const [buscaServico, setBuscaServico] = useState("");
  const [filtroServicoStatus, setFiltroServicoStatus] = useState("todos");
  const [buscaCupom, setBuscaCupom] = useState("");
  const [filtroCupomStatus, setFiltroCupomStatus] = useState("todos");

  const [novoAdminNome, setNovoAdminNome] = useState("");
  const [novoAdminEmail, setNovoAdminEmail] = useState("");
  const [novoAdminSenha, setNovoAdminSenha] = useState("");
  const [novoAdminNivel, setNovoAdminNivel] = useState("suporte");

  const [novoServicoNome, setNovoServicoNome] = useState("");
  const [novoServicoSlug, setNovoServicoSlug] = useState("");
  const [novoServicoDescricao, setNovoServicoDescricao] = useState("");

  const [novoPlanoServicoId, setNovoPlanoServicoId] = useState("");
  const [novoPlanoNome, setNovoPlanoNome] = useState("");
  const [novoPlanoDescricao, setNovoPlanoDescricao] = useState("");
  const [novoPlanoValor, setNovoPlanoValor] = useState("");
  const [novoPlanoMeses, setNovoPlanoMeses] = useState("1");
  const [novoPlanoDestaque, setNovoPlanoDestaque] = useState(false);

  const [novoCupomCodigo, setNovoCupomCodigo] = useState("");
  const [novoCupomDescricao, setNovoCupomDescricao] = useState("");
  const [novoCupomTipo, setNovoCupomTipo] = useState("percentual");
  const [novoCupomValor, setNovoCupomValor] = useState("");
  const [novoCupomLimite, setNovoCupomLimite] = useState("");
  const [novoCupomServicoId, setNovoCupomServicoId] = useState("");
  const [novoCupomPlanoId, setNovoCupomPlanoId] = useState("");
  const [novoCupomDataInicio, setNovoCupomDataInicio] = useState("");
  const [novoCupomDataFim, setNovoCupomDataFim] = useState("");

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
      }, 5000);

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
    await recarregarDados(token);
    await carregarDashboard(token);
    await carregarInstancias();
    await carregarCatalogo(token);
    await carregarCupons(token);

    if (adminParam?.nivel === "dono") {
      await carregarUsuariosAdmin(token);
      await carregarPermissoes(token);
    }
  }

  async function carregarPermissoes(tokenParam?: string) {
    const token = tokenParam || adminToken;

    const res = await fetch("/api/admin/permissoes", {
      headers: { "x-admin-token": token },
    });

    const data = await res.json();

    if (res.ok && data.ok) {
      setPermissoes(data.permissoes || []);
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

    if (res.ok) {
      const data = await res.json();
      setDashboard(data);
    }
  }

  async function carregarInstancias() {
    const res = await fetch("/api/admin/instances");
    const data = await res.json();

    if (Array.isArray(data)) {
      const ordenadas = [...data].sort((a, b) => {
        if (a.conectado && !b.conectado) return -1;
        if (!a.conectado && b.conectado) return 1;
        return String(a.instance || "").localeCompare(String(b.instance || ""));
      });

      setInstancias(ordenadas);
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

      if (!novoPlanoServicoId && data.servicos?.[0]?.id) {
        setNovoPlanoServicoId(data.servicos[0].id);
      }
    }
  }

  async function carregarCupons(tokenParam?: string) {
    const token = tokenParam || adminToken;

    const res = await fetch("/api/admin/cupons", {
      headers: { "x-admin-token": token },
    });

    const data = await res.json();

    if (res.ok && data.ok) {
      setCupons(data.cupons || []);
    }
  }

  async function carregarUsuariosAdmin(tokenParam?: string) {
    const token = tokenParam || adminToken;

    const res = await fetch("/api/admin/usuarios", {
      headers: { "x-admin-token": token },
    });

    const data = await res.json();

    if (res.ok && data.ok) {
      setUsuariosAdmin(data.usuarios || []);
    }
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
    const confirmar = confirm(
      `Tem certeza que deseja excluir o cliente ${cliente.nome}?\n\nIsso vai apagar cadastro, serviços, pagamentos e tentar remover a instância.`
    );

    if (!confirmar) return;

    const confirmarFinal = confirm(
      "Essa ação não pode ser desfeita. Deseja realmente continuar?"
    );

    if (!confirmarFinal) return;

    const res = await fetch("/api/admin/excluir-cliente", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({
        cliente_id: cliente.id,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.detalhe || data.error || "Erro ao excluir cliente.");
      return;
    }

    alert("Cliente excluído com sucesso.");
    await recarregarDados();
    await carregarDashboard();
    await carregarInstancias();
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
      body: JSON.stringify({
        acao: "atualizar",
        ...cupom,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.detalhe || data.error || "Erro ao atualizar cupom.");
      return;
    }

    alert("Cupom atualizado.");
    await carregarCupons();
  }

  async function criarServico() {
    if (!novoServicoNome || !novoServicoSlug) {
      alert("Informe nome e slug do serviço.");
      return;
    }

    const res = await fetch("/api/admin/catalogo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({
        acao: "criar_servico",
        nome: novoServicoNome,
        slug: novoServicoSlug,
        descricao: novoServicoDescricao,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.detalhe || data.error || "Erro ao criar serviço.");
      return;
    }

    setNovoServicoNome("");
    setNovoServicoSlug("");
    setNovoServicoDescricao("");

    alert("Serviço criado.");
    await carregarCatalogo();
  }

  async function atualizarServico(servico: any) {
    const res = await fetch("/api/admin/catalogo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({
        acao: "atualizar_servico",
        ...servico,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.detalhe || data.error || "Erro ao atualizar serviço.");
      return;
    }

    alert("Serviço atualizado.");
    await carregarCatalogo();
  }

  async function criarPlanoCatalogo() {
    if (!novoPlanoServicoId || !novoPlanoNome || !novoPlanoValor || !novoPlanoMeses) {
      alert("Informe serviço, nome, valor e meses.");
      return;
    }

    const res = await fetch("/api/admin/catalogo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({
        acao: "criar_plano",
        servico_id: novoPlanoServicoId,
        nome: novoPlanoNome,
        descricao: novoPlanoDescricao,
        valor: novoPlanoValor,
        meses: novoPlanoMeses,
        destaque: novoPlanoDestaque,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.detalhe || data.error || "Erro ao criar plano.");
      return;
    }

    setNovoPlanoNome("");
    setNovoPlanoDescricao("");
    setNovoPlanoValor("");
    setNovoPlanoMeses("1");
    setNovoPlanoDestaque(false);

    alert("Plano criado.");
    await carregarCatalogo();
  }

  async function atualizarPlanoCatalogo(plano: any) {
    const res = await fetch("/api/admin/catalogo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({
        acao: "atualizar_plano",
        ...plano,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.detalhe || data.error || "Erro ao atualizar plano.");
      return;
    }

    alert("Plano atualizado.");
    await carregarCatalogo();
  }

  async function atualizarTermos() {
    if (!termos?.titulo || !termos?.conteudo) {
      alert("Informe título e conteúdo dos termos.");
      return;
    }

    const res = await fetch("/api/admin/catalogo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({
        acao: "atualizar_termos",
        titulo: termos.titulo,
        conteudo: termos.conteudo,
        ativo: termos.ativo,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.detalhe || data.error || "Erro ao atualizar termos.");
      return;
    }

    alert("Termos atualizados.");
    await carregarCatalogo();
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

  async function acaoCliente(id: string, acao: string) {
    const res = await fetch("/api/admin/cliente-acao", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({
        cliente_id: id,
        acao,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.detalhe || data.error || "Erro ao executar ação");
      return;
    }

    if (acao === "gerar_link" && data.link) {
      alert("Link de pagamento:\n" + data.link);
    } else {
      alert("Ação realizada com sucesso");
    }

    await recarregarDados();
    await carregarDashboard();
    await carregarInstancias();
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
    const mapa: any = {
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

  const clientesFiltrados = useMemo(() => {
    const busca = buscaCliente.toLowerCase().trim();

    return clientes.filter((cliente) => {
      const servicosTexto = (cliente.servicos_cliente || [])
        .map((s: any) => {
          return `${s.servicos_ia?.nome || ""} ${s.planos?.nome || ""} ${s.status || ""}`;
        })
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

  const usuariosAdminFiltrados = useMemo(() => {
    const busca = buscaUsuarioAdmin.toLowerCase().trim();

    if (!busca) return [];

    return usuariosAdmin.filter((u) => {
      const texto = [u.nome, u.email, u.nivel, u.ativo ? "ativo" : "inativo"]
        .join(" ")
        .toLowerCase();

      return texto.includes(busca);
    });
  }, [usuariosAdmin, buscaUsuarioAdmin]);

  const servicosFiltrados = useMemo(() => {
    const busca = buscaServico.toLowerCase().trim();

    return servicos.filter((servico) => {
      const texto = [
        servico.nome,
        servico.slug,
        servico.descricao,
        ...(servico.planos || []).map((p: any) => `${p.nome} ${p.descricao}`),
      ]
        .join(" ")
        .toLowerCase();

      const bateBusca = !busca || texto.includes(busca);
      const bateStatus =
        filtroServicoStatus === "todos" ||
        (filtroServicoStatus === "ativos" && servico.ativo) ||
        (filtroServicoStatus === "inativos" && !servico.ativo);

      return bateBusca && bateStatus;
    });
  }, [servicos, buscaServico, filtroServicoStatus]);

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

  const instanciasFiltradas = useMemo(() => {
    const busca = buscaInstancia.toLowerCase().trim();

    const filtradas = instancias.filter((instancia) => {
      const texto = [
        instancia.instance,
        instancia.status,
        instancia.numero,
        instancia.nome,
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

    return filtradas.sort((a, b) => {
      if (a.conectado && !b.conectado) return -1;
      if (!a.conectado && b.conectado) return 1;
      return String(a.instance || "").localeCompare(String(b.instance || ""));
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

  const planosTodos = useMemo(() => {
    return servicos.flatMap((servico) =>
      (servico.planos || []).map((plano: any) => ({
        ...plano,
        servico_nome: servico.nome,
      }))
    );
  }, [servicos]);

  useEffect(() => {
    setPaginaClientes(1);
  }, [buscaCliente, filtroStatusCliente]);

  useEffect(() => {
    setPaginaInstancias(1);
  }, [buscaInstancia, filtroStatusInstancia]);

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
            onClick={async () => carregarTudo(adminToken, admin)}
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
        <Aba ativa={aba === "resumo"} onClick={() => setAba("resumo")}>
          Resumo
        </Aba>

        <Aba ativa={aba === "catalogo"} onClick={() => setAba("catalogo")}>
          Serviços e planos
        </Aba>

        <Aba ativa={aba === "cupons"} onClick={() => setAba("cupons")}>
          Cupons
        </Aba>

        <Aba ativa={aba === "clientes"} onClick={() => setAba("clientes")}>
          Clientes
        </Aba>

        <Aba ativa={aba === "instancias"} onClick={() => setAba("instancias")}>
          Instâncias
        </Aba>

        {ehDono() && (
          <Aba ativa={aba === "usuarios"} onClick={() => setAba("usuarios")}>
            Usuários admin
          </Aba>
        )}

        {ehDono() && (
          <Aba ativa={aba === "permissoes"} onClick={() => setAba("permissoes")}>
            Permissões
          </Aba>
        )}
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

          <TabelaClientes
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

          <TabelaInstancias instancias={instanciasPaginadas} />

          <Paginacao
            pagina={paginaInstancias}
            totalPaginas={totalPaginasInstancias}
            setPagina={setPaginaInstancias}
          />
        </section>
      )}

      {aba === "catalogo" && (
        <section className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">Serviços e planos</h2>
          <p className="text-gray-400 mb-6">
            Esta área continua funcionando com os serviços, planos e termos já cadastrados.
          </p>
        </section>
      )}

      {aba === "cupons" && (
        <section className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">Cupons</h2>
          <p className="text-gray-400 mb-6">
            Esta área continua funcionando com os cupons já cadastrados.
          </p>
        </section>
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

function TabelaClientes({
  clientes,
  acaoCliente,
  acessarCliente,
  excluirCliente,
  statusPt,
  dataPt,
}: any) {
  return (
    <div className="grid gap-4">
      {clientes.map((cliente: any) => (
        <div
          key={cliente.id}
          className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5"
        >
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                <h3 className="text-xl font-bold">{cliente.nome}</h3>
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
              <button
                onClick={() => acessarCliente(cliente.id)}
                className="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded font-bold"
              >
                Entrar
              </button>

              <button
                onClick={() => acaoCliente(cliente.id, "bloquear")}
                className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded font-bold"
              >
                Bloquear
              </button>

              <button
                onClick={() => acaoCliente(cliente.id, "reativar")}
                className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded font-bold"
              >
                Reativar
              </button>

              <button
                onClick={() => acaoCliente(cliente.id, "gerar_link")}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded font-bold"
              >
                Link
              </button>

              <button
                onClick={() => acaoCliente(cliente.id, "cobrar")}
                className="bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded font-bold"
              >
                Cobrar
              </button>

              <button
                onClick={() => excluirCliente(cliente)}
                className="bg-zinc-700 hover:bg-red-800 border border-red-700 px-3 py-2 rounded font-bold"
              >
                Excluir
              </button>
            </div>
          </div>

          <div className="mt-5 border-t border-zinc-800 pt-4">
            <h4 className="font-bold mb-3">Serviços adquiridos</h4>

            <div className="grid gap-3">
              {(cliente.servicos_cliente || []).map((servico: any) => (
                <div
                  key={servico.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-xl p-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="font-bold">
                        {servico.servicos_ia?.nome || "Serviço"}
                      </p>

                      <p className="text-gray-400 text-sm">
                        Plano: {servico.planos?.nome || servico.plano_id || "-"}
                      </p>
                    </div>

                    <StatusBadge status={statusPt(servico.status)} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    <InfoMini label="Início" value={dataPt(servico.data_inicio)} />
                    <InfoMini label="Expiração" value={dataPt(servico.data_expiracao)} />
                    <InfoMini label="Plano ID" value={servico.plano_id || "-"} />
                  </div>
                </div>
              ))}

              {(!cliente.servicos_cliente || cliente.servicos_cliente.length === 0) && (
                <p className="text-gray-400 text-sm">
                  Nenhum serviço vinculado a este cliente.
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {clientes.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 text-center text-gray-400">
          Nenhum cliente encontrado.
        </div>
      )}
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
      <p className="font-semibold break-all">{value || "-"}</p>
    </div>
  );
}

function TabelaInstancias({ instancias }: any) {
  return (
    <div className="overflow-x-auto bg-zinc-900 border border-zinc-700 rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700 text-left">
            <th className="p-3">Status</th>
            <th className="p-3">Instância</th>
            <th className="p-3">Nome</th>
            <th className="p-3">Número</th>
            <th className="p-3">Estado</th>
          </tr>
        </thead>

        <tbody>
          {instancias.map((instancia: any, index: number) => (
            <tr key={index} className="border-b border-zinc-800">
              <td className="p-3">
                <span
                  className={`px-3 py-1 rounded-full border text-xs font-bold ${
                    instancia.conectado
                      ? "bg-green-900/40 text-green-400 border-green-700"
                      : "bg-red-900/40 text-red-400 border-red-700"
                  }`}
                >
                  {instancia.conectado ? "Conectada" : "Desconectada"}
                </span>
              </td>
              <td className="p-3">{instancia.instance}</td>
              <td className="p-3">{instancia.nome || "-"}</td>
              <td className="p-3">{instancia.numero || "-"}</td>
              <td className="p-3">{instancia.status || "-"}</td>
            </tr>
          ))}

          {instancias.length === 0 && (
            <tr>
              <td className="p-5 text-center text-gray-400" colSpan={5}>
                Nenhuma instância encontrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
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