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

  function podeGerenciarCatalogo() {
    return admin?.nivel === "dono" || admin?.nivel === "admin";
  }

  function podeGerenciarCupons() {
    return (
      admin?.nivel === "dono" ||
      admin?.nivel === "admin" ||
      admin?.nivel === "financeiro"
    );
  }

  function podeBloquearReativar() {
    return admin?.nivel === "dono" || admin?.nivel === "admin";
  }

  function podeFinanceiro() {
    return (
      admin?.nivel === "dono" ||
      admin?.nivel === "admin" ||
      admin?.nivel === "financeiro"
    );
  }

  async function carregarTudo(token: string, adminParam = admin) {
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
        <Aba ativa={aba === "resumo"} onClick={() => setAba("resumo")}>
          Resumo
        </Aba>

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

          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-2">Visão geral</h2>
            <p className="text-gray-400">
              Use as abas acima para gerenciar serviços, planos, cupons, clientes,
              instâncias e usuários administrativos.
            </p>
          </div>
        </section>
      )}

      {aba === "cupons" && podeGerenciarCupons() && (
        <section className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold">Cupons de desconto</h2>
              <p className="text-gray-400 text-sm">
                Crie cupons para promoções, parcerias e campanhas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full md:w-auto">
              <input
                value={buscaCupom}
                onChange={(e) => setBuscaCupom(e.target.value)}
                placeholder="Pesquisar cupom..."
                className="p-3 rounded bg-zinc-800 border border-zinc-700 min-w-[280px]"
              />

              <select
                value={filtroCupomStatus}
                onChange={(e) => setFiltroCupomStatus(e.target.value)}
                className="p-3 rounded bg-zinc-800 border border-zinc-700"
              >
                <option value="todos">Todos</option>
                <option value="ativos">Ativos</option>
                <option value="inativos">Inativos</option>
              </select>
            </div>
          </div>

          <div className="border border-zinc-700 rounded-xl p-4 mb-6">
            <h3 className="font-bold mb-3">Criar cupom</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                value={novoCupomCodigo}
                onChange={(e) => setNovoCupomCodigo(e.target.value.toUpperCase())}
                placeholder="Código. Ex: PARCEIRO10"
                className="p-3 rounded bg-zinc-800 border border-zinc-700"
              />

              <select
                value={novoCupomTipo}
                onChange={(e) => setNovoCupomTipo(e.target.value)}
                className="p-3 rounded bg-zinc-800 border border-zinc-700"
              >
                <option value="percentual">Percentual (%)</option>
                <option value="fixo">Valor fixo (R$)</option>
              </select>

              <input
                value={novoCupomValor}
                onChange={(e) => setNovoCupomValor(e.target.value)}
                placeholder={novoCupomTipo === "percentual" ? "Ex: 10" : "Ex: 20"}
                className="p-3 rounded bg-zinc-800 border border-zinc-700"
              />

              <input
                value={novoCupomLimite}
                onChange={(e) => setNovoCupomLimite(e.target.value)}
                placeholder="Limite de usos"
                className="p-3 rounded bg-zinc-800 border border-zinc-700"
              />

              <select
                value={novoCupomServicoId}
                onChange={(e) => {
                  setNovoCupomServicoId(e.target.value);
                  setNovoCupomPlanoId("");
                }}
                className="p-3 rounded bg-zinc-800 border border-zinc-700"
              >
                <option value="">Todos os serviços</option>
                {servicos.map((servico) => (
                  <option key={servico.id} value={servico.id}>
                    {servico.nome}
                  </option>
                ))}
              </select>

              <select
                value={novoCupomPlanoId}
                onChange={(e) => setNovoCupomPlanoId(e.target.value)}
                className="p-3 rounded bg-zinc-800 border border-zinc-700"
              >
                <option value="">Todos os planos</option>
                {planosTodos
                  .filter((plano: any) => {
                    if (!novoCupomServicoId) return true;
                    return plano.servico_id === novoCupomServicoId;
                  })
                  .map((plano: any) => (
                    <option key={plano.id} value={plano.id}>
                      {plano.servico_nome} - {plano.nome}
                    </option>
                  ))}
              </select>

              <input
                type="datetime-local"
                value={novoCupomDataInicio}
                onChange={(e) => setNovoCupomDataInicio(e.target.value)}
                className="p-3 rounded bg-zinc-800 border border-zinc-700"
              />

              <input
                type="datetime-local"
                value={novoCupomDataFim}
                onChange={(e) => setNovoCupomDataFim(e.target.value)}
                className="p-3 rounded bg-zinc-800 border border-zinc-700"
              />

              <textarea
                value={novoCupomDescricao}
                onChange={(e) => setNovoCupomDescricao(e.target.value)}
                placeholder="Descrição do cupom"
                className="md:col-span-3 p-3 rounded bg-zinc-800 border border-zinc-700 min-h-20"
              />

              <button
                onClick={criarCupom}
                className="bg-green-600 hover:bg-green-700 rounded font-bold"
              >
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
                  <th className="p-3">Serviço</th>
                  <th className="p-3">Plano</th>
                  <th className="p-3">Ação</th>
                </tr>
              </thead>

              <tbody>
                {cuponsFiltrados.map((cupom) => {
                  const indexReal = cupons.findIndex((c) => c.id === cupom.id);

                  return (
                    <tr key={cupom.id} className="border-b border-zinc-800">
                      <td className="p-3">
                        <input
                          value={cupom.codigo}
                          onChange={(e) => {
                            const novo = [...cupons];
                            novo[indexReal].codigo = e.target.value.toUpperCase();
                            setCupons(novo);
                          }}
                          className="p-2 rounded bg-zinc-900 border border-zinc-700"
                        />
                      </td>

                      <td className="p-3">
                        <select
                          value={cupom.tipo}
                          onChange={(e) => {
                            const novo = [...cupons];
                            novo[indexReal].tipo = e.target.value;
                            setCupons(novo);
                          }}
                          className="p-2 rounded bg-zinc-900 border border-zinc-700"
                        >
                          <option value="percentual">%</option>
                          <option value="fixo">R$</option>
                        </select>
                      </td>

                      <td className="p-3">
                        <input
                          value={cupom.valor}
                          onChange={(e) => {
                            const novo = [...cupons];
                            novo[indexReal].valor = e.target.value;
                            setCupons(novo);
                          }}
                          className="p-2 rounded bg-zinc-900 border border-zinc-700 w-24"
                        />
                      </td>

                      <td className="p-3">
                        {cupom.usos_atuais || 0} / {cupom.limite_usos || "∞"}
                      </td>

                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={cupom.ativo}
                          onChange={(e) => {
                            const novo = [...cupons];
                            novo[indexReal].ativo = e.target.checked;
                            setCupons(novo);
                          }}
                        />
                      </td>

                      <td className="p-3">
                        <select
                          value={cupom.servico_id || ""}
                          onChange={(e) => {
                            const novo = [...cupons];
                            novo[indexReal].servico_id = e.target.value || null;
                            novo[indexReal].plano_id = null;
                            setCupons(novo);
                          }}
                          className="p-2 rounded bg-zinc-900 border border-zinc-700"
                        >
                          <option value="">Todos</option>
                          {servicos.map((servico) => (
                            <option key={servico.id} value={servico.id}>
                              {servico.nome}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-3">
                        <select
                          value={cupom.plano_id || ""}
                          onChange={(e) => {
                            const novo = [...cupons];
                            novo[indexReal].plano_id = e.target.value || null;
                            setCupons(novo);
                          }}
                          className="p-2 rounded bg-zinc-900 border border-zinc-700"
                        >
                          <option value="">Todos</option>
                          {planosTodos
                            .filter((plano: any) => {
                              if (!cupom.servico_id) return true;
                              return plano.servico_id === cupom.servico_id;
                            })
                            .map((plano: any) => (
                              <option key={plano.id} value={plano.id}>
                                {plano.servico_nome} - {plano.nome}
                              </option>
                            ))}
                        </select>
                      </td>

                      <td className="p-3">
                        <button
                          onClick={() => atualizarCupom(cupons[indexReal])}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded"
                        >
                          Salvar
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {cuponsFiltrados.length === 0 && (
                  <tr>
                    <td className="p-5 text-center text-gray-400" colSpan={8}>
                      Nenhum cupom encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {aba === "catalogo" && podeGerenciarCatalogo() && (
        <section className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold">Serviços, planos e termos</h2>
              <p className="text-gray-400 text-sm">
                Cadastre suas IAs, planos e termos exibidos na tela inicial.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full md:w-auto">
              <input
                value={buscaServico}
                onChange={(e) => setBuscaServico(e.target.value)}
                placeholder="Pesquisar serviço ou plano..."
                className="p-3 rounded bg-zinc-800 border border-zinc-700 min-w-[280px]"
              />

              <select
                value={filtroServicoStatus}
                onChange={(e) => setFiltroServicoStatus(e.target.value)}
                className="p-3 rounded bg-zinc-800 border border-zinc-700"
              >
                <option value="todos">Todos</option>
                <option value="ativos">Serviços ativos</option>
                <option value="inativos">Serviços inativos</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <div className="border border-zinc-700 rounded-xl p-4">
              <h3 className="font-bold mb-3">Criar serviço</h3>

              <div className="grid gap-3">
                <input
                  value={novoServicoNome}
                  onChange={(e) => setNovoServicoNome(e.target.value)}
                  placeholder="Nome do serviço"
                  className="p-3 rounded bg-zinc-800 border border-zinc-700"
                />

                <input
                  value={novoServicoSlug}
                  onChange={(e) => setNovoServicoSlug(e.target.value)}
                  placeholder="slug-do-servico"
                  className="p-3 rounded bg-zinc-800 border border-zinc-700"
                />

                <textarea
                  value={novoServicoDescricao}
                  onChange={(e) => setNovoServicoDescricao(e.target.value)}
                  placeholder="Descrição do serviço"
                  className="p-3 rounded bg-zinc-800 border border-zinc-700 min-h-24"
                />

                <button
                  onClick={criarServico}
                  className="bg-green-600 hover:bg-green-700 py-3 rounded font-bold"
                >
                  Criar serviço
                </button>
              </div>
            </div>

            <div className="border border-zinc-700 rounded-xl p-4">
              <h3 className="font-bold mb-3">Criar plano</h3>

              <div className="grid gap-3">
                <select
                  value={novoPlanoServicoId}
                  onChange={(e) => setNovoPlanoServicoId(e.target.value)}
                  className="p-3 rounded bg-zinc-800 border border-zinc-700"
                >
                  {servicos.map((servico) => (
                    <option key={servico.id} value={servico.id}>
                      {servico.nome}
                    </option>
                  ))}
                </select>

                <input
                  value={novoPlanoNome}
                  onChange={(e) => setNovoPlanoNome(e.target.value)}
                  placeholder="Nome do plano"
                  className="p-3 rounded bg-zinc-800 border border-zinc-700"
                />

                <textarea
                  value={novoPlanoDescricao}
                  onChange={(e) => setNovoPlanoDescricao(e.target.value)}
                  placeholder="Descrição do plano"
                  className="p-3 rounded bg-zinc-800 border border-zinc-700 min-h-20"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={novoPlanoValor}
                    onChange={(e) => setNovoPlanoValor(e.target.value)}
                    placeholder="Valor"
                    className="p-3 rounded bg-zinc-800 border border-zinc-700"
                  />

                  <input
                    value={novoPlanoMeses}
                    onChange={(e) => setNovoPlanoMeses(e.target.value)}
                    placeholder="Meses"
                    className="p-3 rounded bg-zinc-800 border border-zinc-700"
                  />
                </div>

                <label className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    checked={novoPlanoDestaque}
                    onChange={(e) => setNovoPlanoDestaque(e.target.checked)}
                  />
                  Plano em destaque
                </label>

                <button
                  onClick={criarPlanoCatalogo}
                  className="bg-blue-600 hover:bg-blue-700 py-3 rounded font-bold"
                >
                  Criar plano
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            {servicosFiltrados.map((servico) => {
              const indexReal = servicos.findIndex((s) => s.id === servico.id);

              return (
                <div key={servico.id} className="border border-zinc-700 rounded-xl p-4">
                  <h3 className="font-bold mb-3">Serviço</h3>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                    <input
                      value={servico.nome}
                      onChange={(e) => {
                        const novo = [...servicos];
                        novo[indexReal].nome = e.target.value;
                        setServicos(novo);
                      }}
                      className="p-3 rounded bg-zinc-800 border border-zinc-700"
                    />

                    <input
                      value={servico.slug}
                      onChange={(e) => {
                        const novo = [...servicos];
                        novo[indexReal].slug = e.target.value;
                        setServicos(novo);
                      }}
                      className="p-3 rounded bg-zinc-800 border border-zinc-700"
                    />

                    <input
                      value={servico.ordem || 0}
                      onChange={(e) => {
                        const novo = [...servicos];
                        novo[indexReal].ordem = Number(e.target.value);
                        setServicos(novo);
                      }}
                      className="p-3 rounded bg-zinc-800 border border-zinc-700"
                    />

                    <label className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        checked={servico.ativo}
                        onChange={(e) => {
                          const novo = [...servicos];
                          novo[indexReal].ativo = e.target.checked;
                          setServicos(novo);
                        }}
                      />
                      Ativo
                    </label>

                    <button
                      onClick={() => atualizarServico(servicos[indexReal])}
                      className="bg-blue-600 hover:bg-blue-700 py-3 rounded font-bold"
                    >
                      Salvar serviço
                    </button>
                  </div>

                  <textarea
                    value={servico.descricao || ""}
                    onChange={(e) => {
                      const novo = [...servicos];
                      novo[indexReal].descricao = e.target.value;
                      setServicos(novo);
                    }}
                    className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 min-h-20 mb-4"
                  />

                  <h4 className="font-bold mb-3">Planos deste serviço</h4>

                  <div className="grid gap-3">
                    {(servico.planos || []).map((plano: any, pIndex: number) => (
                      <div
                        key={plano.id}
                        className="grid grid-cols-1 md:grid-cols-8 gap-3 bg-zinc-800 border border-zinc-700 rounded-xl p-3"
                      >
                        <input
                          value={plano.nome}
                          onChange={(e) => {
                            const novo = [...servicos];
                            novo[indexReal].planos[pIndex].nome = e.target.value;
                            setServicos(novo);
                          }}
                          className="p-2 rounded bg-zinc-900 border border-zinc-700"
                        />

                        <input
                          value={plano.valor}
                          onChange={(e) => {
                            const novo = [...servicos];
                            novo[indexReal].planos[pIndex].valor = e.target.value;
                            setServicos(novo);
                          }}
                          className="p-2 rounded bg-zinc-900 border border-zinc-700"
                        />

                        <input
                          value={plano.meses}
                          onChange={(e) => {
                            const novo = [...servicos];
                            novo[indexReal].planos[pIndex].meses = Number(e.target.value);
                            setServicos(novo);
                          }}
                          className="p-2 rounded bg-zinc-900 border border-zinc-700"
                        />

                        <input
                          value={plano.ordem || 0}
                          onChange={(e) => {
                            const novo = [...servicos];
                            novo[indexReal].planos[pIndex].ordem = Number(e.target.value);
                            setServicos(novo);
                          }}
                          className="p-2 rounded bg-zinc-900 border border-zinc-700"
                        />

                        <label className="flex gap-2 items-center">
                          <input
                            type="checkbox"
                            checked={plano.ativo}
                            onChange={(e) => {
                              const novo = [...servicos];
                              novo[indexReal].planos[pIndex].ativo = e.target.checked;
                              setServicos(novo);
                            }}
                          />
                          Ativo
                        </label>

                        <label className="flex gap-2 items-center">
                          <input
                            type="checkbox"
                            checked={plano.destaque}
                            onChange={(e) => {
                              const novo = [...servicos];
                              novo[indexReal].planos[pIndex].destaque = e.target.checked;
                              setServicos(novo);
                            }}
                          />
                          Destaque
                        </label>

                        <button
                          onClick={() => atualizarPlanoCatalogo(servicos[indexReal].planos[pIndex])}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded"
                        >
                          Salvar
                        </button>

                        <textarea
                          value={plano.descricao || ""}
                          onChange={(e) => {
                            const novo = [...servicos];
                            novo[indexReal].planos[pIndex].descricao = e.target.value;
                            setServicos(novo);
                          }}
                          placeholder="Descrição"
                          className="md:col-span-8 p-2 rounded bg-zinc-900 border border-zinc-700"
                        />
                      </div>
                    ))}

                    {(servico.planos || []).length === 0 && (
                      <p className="text-gray-400 text-sm">
                        Nenhum plano cadastrado para este serviço.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {servicosFiltrados.length === 0 && (
              <div className="border border-zinc-700 rounded-xl p-5 text-center text-gray-400">
                Nenhum serviço encontrado.
              </div>
            )}
          </div>

          {termos && (
            <div className="mt-8 border border-zinc-700 rounded-xl p-4">
              <h3 className="font-bold mb-3">Termos de uso</h3>

              <input
                value={termos.titulo || ""}
                onChange={(e) => setTermos({ ...termos, titulo: e.target.value })}
                className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 mb-3"
              />

              <textarea
                value={termos.conteudo || ""}
                onChange={(e) => setTermos({ ...termos, conteudo: e.target.value })}
                className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 min-h-40 mb-3"
              />

              <label className="flex gap-2 items-center mb-3">
                <input
                  type="checkbox"
                  checked={termos.ativo}
                  onChange={(e) => setTermos({ ...termos, ativo: e.target.checked })}
                />
                Termos ativos
              </label>

              <button
                onClick={atualizarTermos}
                className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded font-bold"
              >
                Salvar termos
              </button>
            </div>
          )}
        </section>
      )}

      {aba === "clientes" && (
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
            acaoCliente={acaoCliente}
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

      {aba === "usuarios" && ehDono() && (
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
  acaoCliente,
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
            <th className="p-3">Área</th>
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
                <a
                  href={`/cliente?cliente=${cliente.id}`}
                  target="_blank"
                  className="text-green-400 underline"
                >
                  Abrir
                </a>
              </td>
              <td className="p-3">
                <div className="flex gap-2 flex-wrap">
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
              <td className="p-5 text-center text-gray-400" colSpan={8}>
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