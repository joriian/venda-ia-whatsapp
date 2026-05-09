"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";

import { useRouter } from "next/navigation";

import AdminSidebar from "@/components/admin/layout/AdminSidebar";
import AdminTopbar from "@/components/admin/layout/AdminTopbar";

import AdminResumoCards from "@/components/admin/dashboard/AdminResumoCards";
import AdminInstanciasTable from "@/components/admin/dashboard/AdminInstanciasTable";

import AdminClientes from "@/components/admin/clientes/AdminClientes";
import AdminFinanceiro from "@/components/admin/financeiro/AdminFinanceiro";
import AdminUsuarios from "@/components/admin/usuarios/AdminUsuarios";
import AdminCatalogo from "@/components/admin/catalogo/AdminCatalogo";

import AdminLogs from "@/components/admin/AdminLogs";
import AdminSaudeAutomacoes from "@/components/admin/AdminSaudeAutomacoes";
import AdminNotificacoes from "@/components/admin/AdminNotificacoes";
import AdminDashboardSaude from "@/components/admin/AdminDashboardSaude";

type AnyObj = any;

type Aba =
  | "dashboard"
  | "clientes"
  | "financeiro"
  | "usuarios"
  | "catalogo"
  | "instancias"
  | "notificacoes"
  | "saude"
  | "logs";

const PERMISSOES_TOTAIS = {
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

export default function AdminPage() {
  const router = useRouter();

  const [abaAtiva, setAbaAtiva] = useState<Aba>("dashboard");
  const [admin, setAdmin] = useState<AnyObj>(null);
  const [adminToken, setAdminToken] = useState("");
  const [permissoes, setPermissoes] = useState<any>(PERMISSOES_TOTAIS);

  const [carregandoSessao, setCarregandoSessao] = useState(true);

  const [clientes, setClientes] = useState<any[]>([]);
  const [instancias, setInstancias] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);

  const [servicos, setServicos] = useState<any[]>([]);
  const [planos, setPlanos] = useState<any[]>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const iniciouRef = useRef(false);

  function limparSessaoAdmin() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminNome");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("adminNivel");
    localStorage.removeItem("adminSessaoExpira");
  }

  function podeAcessarAba(aba: Aba, p = permissoes) {
    if (!p) return false;

    if (aba === "dashboard") return Boolean(p.pode_ver_resumo);
    if (aba === "clientes") return Boolean(p.pode_ver_clientes);
    if (aba === "financeiro") return Boolean(p.pode_cobrar_clientes);
    if (aba === "usuarios") return Boolean(p.pode_gerenciar_admins);
    if (aba === "catalogo") return Boolean(p.pode_gerenciar_catalogo);
    if (aba === "instancias") return Boolean(p.pode_ver_instancias);

    return true;
  }

  function primeiraAbaPermitida(p: any): Aba {
    if (p?.pode_ver_resumo) return "dashboard";
    if (p?.pode_ver_clientes) return "clientes";
    if (p?.pode_cobrar_clientes) return "financeiro";
    if (p?.pode_gerenciar_catalogo) return "catalogo";
    if (p?.pode_gerenciar_admins) return "usuarios";
    if (p?.pode_ver_instancias) return "instancias";

    return "notificacoes";
  }

  const carregarDashboard = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/admin/dashboard", {
        headers: {
          "x-admin-token": token,
        },
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = await res.json();
      setDashboard(data);
    } catch (error) {
      console.log(error);
    }
  }, []);

  const carregarClientes = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/admin/dados", {
        headers: {
          "x-admin-token": token,
        },
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = await res.json();
      setClientes(data.clientes || []);
    } catch (error) {
      console.log(error);
    }
  }, []);

  const carregarInstancias = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/instances", {
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = await res.json();

      if (!Array.isArray(data)) return;

      setInstancias(data);
    } catch (error) {
      console.log(error);
    }
  }, []);

  const carregarCatalogo = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/admin/catalogo", {
        headers: {
          "x-admin-token": token,
        },
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        console.log("ERRO CATALOGO:", data);
        return;
      }

      const servicosRecebidos = data.servicos || [];

      setServicos(servicosRecebidos);

      const planosTodos = servicosRecebidos.flatMap(
        (servico: any) => servico.planos || []
      );

      setPlanos(planosTodos);
    } catch (error) {
      console.log(error);
    }
  }, []);

  const carregarPermissoes = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/admin/minhas-permissoes", {
        headers: {
          "x-admin-token": token,
        },
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        return null;
      }

      return data.permissoes || null;
    } catch (error) {
      console.log(error);
      return null;
    }
  }, []);

  const iniciarAdmin = useCallback(async () => {
    try {
      const token = localStorage.getItem("adminToken");

      if (!token) {
        router.replace("/admin/login");
        return;
      }

      const res = await fetch("/api/admin/sessao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        limparSessaoAdmin();
        router.replace("/admin/login");
        return;
      }

      setAdmin(data.admin);
      setAdminToken(token);

      const permissoesAdmin = await carregarPermissoes(token);

      const permissoesFinais =
        permissoesAdmin && Object.keys(permissoesAdmin).length > 0
          ? permissoesAdmin
          : PERMISSOES_TOTAIS;

      setPermissoes(permissoesFinais);
      setAbaAtiva(primeiraAbaPermitida(permissoesFinais));

      await Promise.all([
        carregarDashboard(token),
        carregarClientes(token),
        carregarInstancias(),
        carregarCatalogo(token),
      ]);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(async () => {
        await Promise.all([
          carregarDashboard(token),
          carregarClientes(token),
          carregarInstancias(),
          carregarCatalogo(token),
        ]);
      }, 30000);
    } catch (error) {
      console.log(error);
      limparSessaoAdmin();
      router.replace("/admin/login");
    } finally {
      setCarregandoSessao(false);
    }
  }, [
    router,
    carregarDashboard,
    carregarClientes,
    carregarInstancias,
    carregarCatalogo,
    carregarPermissoes,
  ]);

  useEffect(() => {
    if (iniciouRef.current) return;

    iniciouRef.current = true;

    iniciarAdmin();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [iniciarAdmin]);

  async function controlarInstanciaAdmin(
    instanceName: string,
    acao: "status" | "qrcode" | "reiniciar" | "desconectar"
  ) {
    if (!permissoes?.pode_ver_instancias) {
      alert("Sem permissão para gerenciar instâncias.");
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
        alert(data.error || "Erro.");
        return;
      }

      await carregarInstancias();
    } catch (error) {
      console.log(error);
    }
  }

  async function salvarServico(dados: any) {
    try {
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
        alert(data.error || "Erro ao salvar serviço.");
        return;
      }

      alert("Serviço salvo.");
      await carregarCatalogo(adminToken);
    } catch (error) {
      console.log(error);
      alert("Erro ao salvar serviço.");
    }
  }

  async function salvarPlano(dados: any) {
    try {
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
        alert(data.error || "Erro ao salvar plano.");
        return;
      }

      alert("Plano salvo.");
      await carregarCatalogo(adminToken);
    } catch (error) {
      console.log(error);
      alert("Erro ao salvar plano.");
    }
  }

  async function excluirServico(id: string) {
    alert("A exclusão real de serviço será criada na próxima etapa.");
  }

  async function excluirPlano(id: string) {
    alert("A exclusão real de plano será criada na próxima etapa.");
  }

  function mudarAba(aba: Aba) {
    if (!podeAcessarAba(aba)) {
      alert("Você não tem permissão para acessar esta área.");
      return;
    }

    setAbaAtiva(aba);
  }

  async function sair() {
    limparSessaoAdmin();
    router.replace("/admin/login");
  }

  const totalClientes = useMemo(() => {
    return clientes.length;
  }, [clientes]);

  if (carregandoSessao) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="animate-pulse text-xl">
          Carregando painel...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white flex">
      <AdminSidebar
        abaAtiva={abaAtiva}
        setAbaAtiva={mudarAba}
        sair={sair}
        permissoes={permissoes}
      />

      <section className="flex-1 p-6 lg:p-10">
        <AdminTopbar admin={admin} />

        {abaAtiva === "dashboard" && podeAcessarAba("dashboard") && (
          <div>
            <AdminResumoCards
              totalClientes={totalClientes}
              totalInstancias={instancias.length}
              receita={dashboard?.receita_total || 0}
            />

            {permissoes?.pode_ver_instancias && (
              <AdminInstanciasTable
                instancias={instancias}
                controlarInstanciaAdmin={controlarInstanciaAdmin}
              />
            )}
          </div>
        )}

        {abaAtiva === "clientes" && podeAcessarAba("clientes") && (
          <AdminClientes
            clientes={clientes}
            adminToken={adminToken}
            carregarClientes={() => carregarClientes(adminToken)}
          />
        )}

        {abaAtiva === "financeiro" && podeAcessarAba("financeiro") && (
          <AdminFinanceiro
            clientes={clientes}
            dashboard={dashboard}
          />
        )}

        {abaAtiva === "catalogo" && podeAcessarAba("catalogo") && (
          <AdminCatalogo
            servicos={servicos}
            planos={planos}
            salvarServico={salvarServico}
            salvarPlano={salvarPlano}
            editarServico={() => {}}
            editarPlano={() => {}}
            excluirServico={excluirServico}
            excluirPlano={excluirPlano}
          />
        )}

        {abaAtiva === "usuarios" && podeAcessarAba("usuarios") && (
          <AdminUsuarios adminToken={adminToken} />
        )}

        {abaAtiva === "instancias" && podeAcessarAba("instancias") && (
          <AdminInstanciasTable
            instancias={instancias}
            controlarInstanciaAdmin={controlarInstanciaAdmin}
          />
        )}

        {abaAtiva === "saude" && (
          <div className="space-y-10">
            <section className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
              <AdminDashboardSaude adminToken={adminToken} />
            </section>

            <section className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
              <AdminSaudeAutomacoes adminToken={adminToken} />
            </section>
          </div>
        )}

        {abaAtiva === "notificacoes" && (
          <section className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
            <AdminNotificacoes adminToken={adminToken} />
          </section>
        )}

        {abaAtiva === "logs" && (
          <section className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
            <AdminLogs adminToken={adminToken} />
          </section>
        )}
      </section>
    </main>
  );
}