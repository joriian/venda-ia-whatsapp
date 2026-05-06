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

  function ehDono(adminParam = admin) {
    return adminParam?.nivel === "dono";
  }

  function permissaoAtual() {
    const nivel = admin?.nivel;
    const p = permissoes.find((item) => item.nivel === nivel);

    if (nivel === "dono") {
      return {
        pode_ver_resumo: true,
        pode_gerenciar_catalogo: true,
        pode_gerenciar_cupons: true,
        pode_ver_clientes: true,
        pode_bloquear_clientes: true,
        pode_cobrar_clientes: true,
        pode_ver_instancias: true,
        pode_gerenciar_admins: true,
        pode_acessar_cliente: true,
      };
    }

    return p || {};
  }

  function podeVerResumo() {
    return Boolean(permissaoAtual().pode_ver_resumo);
  }

  function podeGerenciarCatalogo() {
    return Boolean(permissaoAtual().pode_gerenciar_catalogo);
  }

  function podeGerenciarCupons() {
    return Boolean(permissaoAtual().pode_gerenciar_cupons);
  }

  function podeVerClientes() {
    return Boolean(permissaoAtual().pode_ver_clientes);
  }

  function podeBloquearReativar() {
    return Boolean(permissaoAtual().pode_bloquear_clientes);
  }

  function podeFinanceiro() {
    return Boolean(permissaoAtual().pode_cobrar_clientes);
  }

  function podeVerInstancias() {
    return Boolean(permissaoAtual().pode_ver_instancias);
  }

  function podeGerenciarAdmins() {
    return Boolean(permissaoAtual().pode_gerenciar_admins);
  }

  function podeAcessarCliente() {
    return Boolean(permissaoAtual().pode_acessar_cliente);
  }

  async function carregarTudo(token: string, adminParam = admin) {
    await carregarPermissoes(token, adminParam);
    await recarregarDados(token);
    await carregarDashboard(token);
    await carregarInstancias();

    if (adminParam?.nivel === "dono" || adminParam?.nivel === "admin") {
      await carregarCatalogo(token);
    }

    if (
      adminParam?.nivel === "dono" ||
      adminParam?.nivel === "admin" ||
      adminParam?.nivel === "financeiro"
    ) {
      await carregarCupons(token);
    }

    if (adminParam?.nivel === "dono") {
      await carregarUsuariosAdmin(token);
    }
  }

  async function carregarPermissoes(tokenParam?: string, adminParam = admin) {
    if (adminParam?.nivel !== "dono") {
      return;
    }

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
    if ((acao === "bloquear" || acao === "reativar") && !podeBloquearReativar()) {
      alert("Seu nível de acesso não permite bloquear ou reativar clientes.");
      return;
    }

    if ((acao === "gerar_link" || acao === "cobrar") && !podeFinanceiro()) {
      alert("Seu nível de acesso não permite ações financeiras.");
      return;
    }

    const confirmar =
      acao === "bloquear"
        ? confirm("Tem certeza que deseja bloquear este cliente?")
        : true;

    if (!confirmar) return;

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

  const clientesFiltrados = useMemo(() => {
    const busca = buscaCliente.toLowerCase().trim();

    return clientes.filter((cliente) => {
      const texto = [
        cliente.nome,
        cliente.email,
        cliente.telefone,
        cliente.status,
        cliente.plano_id,
        cliente.id,
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
        {podeVerResumo() && (
          <Aba ativa={aba === "resumo"} onClick={() => setAba("resumo")}>
            Resumo
          </Aba>
        )}

        {podeGerenciarCatalogo() && (
          <Aba ativa={aba === "catalogo"} onClick={() => setAba("catalogo")}>
            Serviços e planos
          </Aba>
        )}

        {podeGerenciarCupons() && (
          <Aba ativa={aba === "cupons"} onClick={() => setAba("cupons")}>
            Cupons
          </Aba>
        )}

        {podeVerClientes() && (
          <Aba ativa={aba === "clientes"} onClick={() => setAba("clientes")}>
            Clientes
          </Aba>
        )}

        {podeVerInstancias() && (
          <Aba ativa={aba === "instancias"} onClick={() => setAba("instancias")}>
            Instâncias
          </Aba>
        )}

        {podeGerenciarAdmins() && (
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

      {aba === "resumo" && podeVerResumo() && (
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

      {aba === "permissoes" && ehDono() && (
        <section className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-2">Permissões por nível</h2>
          <p className="text-gray-400 text-sm mb-6">
            O nível dono sempre tem acesso total e não pode ser alterado.
          </p>

          <div className="overflow-x-auto border border-zinc-700 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-800 border-b border-zinc-700 text-left">
                  <th className="p-3">Nível</th>
                  <th className="p-3">Resumo</th>
                  <th className="p-3">Catálogo</th>
                  <th className="p-3">Cupons</th>
                  <th className="p-3">Clientes</th>
                  <th className="p-3">Bloquear</th>
                  <th className="p-3">Cobrar</th>
                  <th className="p-3">Instâncias</th>
                  <th className="p-3">Admins</th>
                  <th className="p-3">Entrar Cliente</th>
                  <th className="p-3">Ação</th>
                </tr>
              </thead>

              <tbody>
                {permissoes.map((permissao, index) => (
                  <tr key={permissao.id} className="border-b border-zinc-800">
                    <td className="p-3 font-bold">{permissao.nivel}</td>

                    {[
                      "pode_ver_resumo",
                      "pode_gerenciar_catalogo",
                      "pode_gerenciar_cupons",
                      "pode_ver_clientes",
                      "pode_bloquear_clientes",
                      "pode_cobrar_clientes",
                      "pode_ver_instancias",
                      "pode_gerenciar_admins",
                      "pode_acessar_cliente",
                    ].map((campo) => (
                      <td key={campo} className="p-3">
                        <input
                          type="checkbox"
                          checked={Boolean(permissao[campo])}
                          disabled={permissao.nivel === "dono"}
                          onChange={(e) => {
                            const novo = [...permissoes];
                            novo[index][campo] = e.target.checked;
                            setPermissoes(novo);
                          }}
                        />
                      </td>
                    ))}

                    <td className="p-3">
                      <button
                        disabled={permissao.nivel === "dono"}
                        onClick={() => salvarPermissao(permissao)}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 px-3 py-2 rounded"
                      >
                        Salvar
                      </button>
                    </td>
                  </tr>
                ))}

                {permissoes.length === 0 && (
                  <tr>
                    <td className="p-5 text-center text-gray-400" colSpan={11}>
                      Nenhuma permissão encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {aba === "clientes" && podeVerClientes() && (
        <section className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold">Clientes</h2>
              <p className="text-gray-400 text-sm">
                Exibindo {clientesPaginados.length} de {clientesFiltrados.length} clientes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full md:w-auto">
              <input
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                placeholder="Pesquisar cliente, email, telefone..."
                className="p-3 rounded bg-zinc-800 border border-zinc-700 min-w-[280px]"
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
            podeBloquearReativar={podeBloquearReativar()}
            podeFinanceiro={podeFinanceiro()}
            podeAcessarCliente={podeAcessarCliente()}
            acaoCliente={acaoCliente}
            acessarCliente={acessarCliente}
          />

          <Paginacao
            pagina={paginaClientes}
            totalPaginas={totalPaginasClientes}
            setPagina={setPaginaClientes}
          />
        </section>
      )}

      {aba === "instancias" && podeVerInstancias() && (
        <section>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold">Instâncias em Tempo Real</h2>
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

      {aba === "usuarios" && podeGerenciarAdmins() && (
        <section className="mb-10 bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">Usuários administrativos</h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
            <input
              value={novoAdminNome}
              onChange={(e) => setNovoAdminNome(e.target.value)}
              placeholder="Nome"
              className="p-3 rounded bg-zinc-800 border border-zinc-700"
            />

            <input
              value={novoAdminEmail}
              onChange={(e) => setNovoAdminEmail(e.target.value)}
              placeholder="Email"
              className="p-3 rounded bg-zinc-800 border border-zinc-700"
            />

            <input
              type="password"
              value={novoAdminSenha}
              onChange={(e) => setNovoAdminSenha(e.target.value)}
              placeholder="Senha forte"
              className="p-3 rounded bg-zinc-800 border border-zinc-700"
            />

            <select
              value={novoAdminNivel}
              onChange={(e) => setNovoAdminNivel(e.target.value)}
              className="p-3 rounded bg-zinc-800 border border-zinc-700"
            >
              <option value="suporte">Suporte</option>
              <option value="financeiro">Financeiro</option>
              <option value="admin">Admin</option>
              <option value="dono">Dono</option>
            </select>

            <button
              onClick={criarUsuarioAdmin}
              className="bg-green-600 hover:bg-green-700 py-3 rounded font-bold"
            >
              Criar usuário
            </button>
          </div>

          <input
            value={buscaUsuarioAdmin}
            onChange={(e) => setBuscaUsuarioAdmin(e.target.value)}
            placeholder="Buscar usuário admin para exibir a lista..."
            className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 mb-4"
          />

          {buscaUsuarioAdmin.trim() && (
            <TabelaUsuarios
              usuarios={usuariosAdminFiltrados}
              atualizarUsuarioAdmin={atualizarUsuarioAdmin}
              alterarSenhaAdmin={alterarSenhaAdmin}
            />
          )}
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

function StatusBadge({ status }: { status: string }) {
  const cor =
    status === "ativo"
      ? "bg-green-900/40 text-green-400 border-green-700"
      : status === "vencido"
      ? "bg-red-900/40 text-red-400 border-red-700"
      : "bg-yellow-900/40 text-yellow-400 border-yellow-700";

  return (
    <span className={`px-3 py-1 rounded-full border text-xs font-bold ${cor}`}>
      {status}
    </span>
  );
}

function TabelaClientes({
  clientes,
  podeBloquearReativar,
  podeFinanceiro,
  podeAcessarCliente,
  acaoCliente,
  acessarCliente,
}: any) {
  return (
    <div className="overflow-x-auto bg-zinc-900 border border-zinc-700 rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700 text-left">
            <th className="p-3">Nome</th>
            <th className="p-3">Email</th>
            <th className="p-3">Telefone</th>
            <th className="p-3">Plano</th>
            <th className="p-3">Status</th>
            <th className="p-3">Expira</th>
            <th className="p-3">Ações</th>
          </tr>
        </thead>

        <tbody>
          {clientes.map((cliente: any) => (
            <tr key={cliente.id} className="border-b border-zinc-800 align-top">
              <td className="p-3">{cliente.nome}</td>
              <td className="p-3">{cliente.email}</td>
              <td className="p-3">{cliente.telefone || "-"}</td>
              <td className="p-3">{cliente.plano_id}</td>
              <td className="p-3">
                <StatusBadge status={cliente.status} />
              </td>
              <td className="p-3">
                {cliente.data_expiracao
                  ? new Date(cliente.data_expiracao).toLocaleDateString("pt-BR")
                  : "-"}
              </td>
              <td className="p-3">
                <div className="flex gap-2 flex-wrap">
                  {podeAcessarCliente && (
                    <button
                      onClick={() => acessarCliente(cliente.id)}
                      className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded"
                    >
                      Entrar
                    </button>
                  )}

                  {podeBloquearReativar && (
                    <>
                      <button
                        onClick={() => acaoCliente(cliente.id, "bloquear")}
                        className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
                      >
                        Bloquear
                      </button>

                      <button
                        onClick={() => acaoCliente(cliente.id, "reativar")}
                        className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
                      >
                        Reativar
                      </button>
                    </>
                  )}

                  {podeFinanceiro && (
                    <>
                      <button
                        onClick={() => acaoCliente(cliente.id, "gerar_link")}
                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
                      >
                        Link
                      </button>

                      <button
                        onClick={() => acaoCliente(cliente.id, "cobrar")}
                        className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded"
                      >
                        Cobrar
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}

          {clientes.length === 0 && (
            <tr>
              <td className="p-5 text-center text-gray-400" colSpan={7}>
                Nenhum cliente encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
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

function TabelaUsuarios({
  usuarios,
  atualizarUsuarioAdmin,
  alterarSenhaAdmin,
}: any) {
  return (
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
          {usuarios.map((usuario: any) => (
            <tr key={usuario.id} className="border-b border-zinc-800">
              <td className="p-3">{usuario.nome}</td>
              <td className="p-3">{usuario.email}</td>
              <td className="p-3">{usuario.nivel}</td>
              <td className="p-3">{usuario.ativo ? "Sim" : "Não"}</td>
              <td className="p-3">
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => atualizarUsuarioAdmin(usuario)}
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
                  >
                    Salvar
                  </button>

                  <button
                    onClick={() => alterarSenhaAdmin(usuario)}
                    className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded"
                  >
                    Alterar senha
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {usuarios.length === 0 && (
            <tr>
              <td className="p-5 text-center text-gray-400" colSpan={5}>
                Nenhum usuário encontrado.
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