"use client";

import {
  LayoutDashboard,
  Users,
  Server,
  Bell,
  ShieldCheck,
  Activity,
  LogOut,
  RefreshCcw,
  QrCode,
  Power,
  RotateCw,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";

import { useRouter } from "next/navigation";

import AdminLogs from "@/components/admin/AdminLogs";
import AdminSaudeAutomacoes from "@/components/admin/AdminSaudeAutomacoes";
import AdminNotificacoes from "@/components/admin/AdminNotificacoes";
import AdminDashboardSaude from "@/components/admin/AdminDashboardSaude";

type AnyObj = any;

type Aba =
  | "dashboard"
  | "clientes"
  | "instancias"
  | "notificacoes"
  | "saude"
  | "logs";

export default function AdminPage() {
  const router = useRouter();

  const [abaAtiva, setAbaAtiva] =
    useState<Aba>("dashboard");

  const [admin, setAdmin] = useState<AnyObj>(null);
  const [adminToken, setAdminToken] = useState("");

  const [carregandoSessao, setCarregandoSessao] =
    useState(true);

  const [clientes, setClientes] =
    useState<any[]>([]);

  const [instancias, setInstancias] =
    useState<any[]>([]);

  const [dashboard, setDashboard] =
    useState<any>(null);

  const intervalRef =
    useRef<NodeJS.Timeout | null>(null);

  const iniciouRef = useRef(false);

  function limparSessaoAdmin() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminNome");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("adminNivel");
    localStorage.removeItem(
      "adminSessaoExpira"
    );
  }

  const carregarDashboard =
    useCallback(async (token: string) => {
      try {
        const res = await fetch(
          "/api/admin/dashboard",
          {
            headers: {
              "x-admin-token": token,
            },
            cache: "no-store",
          }
        );

        if (!res.ok) return;

        const data = await res.json();

        setDashboard(data);
      } catch (error) {
        console.log(error);
      }
    }, []);

  const carregarClientes =
    useCallback(async (token: string) => {
      try {
        const res = await fetch(
          "/api/admin/dados",
          {
            headers: {
              "x-admin-token": token,
            },
            cache: "no-store",
          }
        );

        if (!res.ok) return;

        const data = await res.json();

        setClientes(data.clientes || []);
      } catch (error) {
        console.log(error);
      }
    }, []);

  const carregarInstancias =
    useCallback(async () => {
      try {
        const res = await fetch(
          "/api/admin/instances",
          {
            cache: "no-store",
          }
        );

        if (!res.ok) return;

        const data = await res.json();

        if (!Array.isArray(data)) return;

        setInstancias(data);
      } catch (error) {
        console.log(error);
      }
    }, []);

  const iniciarAdmin =
    useCallback(async () => {
      try {
        const token =
          localStorage.getItem(
            "adminToken"
          );

        if (!token) {
          router.replace("/admin/login");
          return;
        }

        const res = await fetch(
          "/api/admin/sessao",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              token,
            }),
          }
        );

        const data = await res.json();

        if (!res.ok || data.error) {
          limparSessaoAdmin();

          router.replace(
            "/admin/login"
          );

          return;
        }

        setAdmin(data.admin);

        setAdminToken(token);

        await Promise.all([
          carregarDashboard(token),
          carregarClientes(token),
          carregarInstancias(),
        ]);

        if (intervalRef.current) {
          clearInterval(
            intervalRef.current
          );
        }

        intervalRef.current =
          setInterval(async () => {
            await Promise.all([
              carregarDashboard(token),
              carregarClientes(token),
              carregarInstancias(),
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
    ]);

  useEffect(() => {
    if (iniciouRef.current) return;

    iniciouRef.current = true;

    iniciarAdmin();

    return () => {
      if (intervalRef.current) {
        clearInterval(
          intervalRef.current
        );
      }
    };
  }, [iniciarAdmin]);

  async function controlarInstanciaAdmin(
    instanceName: string,
    acao:
      | "status"
      | "qrcode"
      | "reiniciar"
      | "desconectar"
  ) {
    try {
      const res = await fetch(
        "/api/admin/evolution",
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
              instanceName,
            acao,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(
          data.error || "Erro."
        );

        return;
      }

      await carregarInstancias();
    } catch (error) {
      console.log(error);
    }
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

      {/* SIDEBAR */}

      <aside className="w-[270px] bg-[#0A0A0A] border-r border-white/10 p-6 hidden lg:flex flex-col">

        <div>
          <h1 className="text-3xl font-black text-green-400">
            NEXORA
          </h1>

          <p className="text-gray-500 text-sm mt-1">
            Painel Administrativo
          </p>
        </div>

        <div className="mt-10 space-y-3">

          <SidebarItem
            icon={
              <LayoutDashboard size={18} />
            }
            label="Dashboard"
            active={
              abaAtiva ===
              "dashboard"
            }
            onClick={() =>
              setAbaAtiva(
                "dashboard"
              )
            }
          />

          <SidebarItem
            icon={<Users size={18} />}
            label="Clientes"
            active={
              abaAtiva ===
              "clientes"
            }
            onClick={() =>
              setAbaAtiva(
                "clientes"
              )
            }
          />

          <SidebarItem
            icon={<Server size={18} />}
            label="Instâncias"
            active={
              abaAtiva ===
              "instancias"
            }
            onClick={() =>
              setAbaAtiva(
                "instancias"
              )
            }
          />

          <SidebarItem
            icon={<Bell size={18} />}
            label="Notificações"
            active={
              abaAtiva ===
              "notificacoes"
            }
            onClick={() =>
              setAbaAtiva(
                "notificacoes"
              )
            }
          />

          <SidebarItem
            icon={
              <ShieldCheck size={18} />
            }
            label="Saúde"
            active={
              abaAtiva ===
              "saude"
            }
            onClick={() =>
              setAbaAtiva(
                "saude"
              )
            }
          />

          <SidebarItem
            icon={
              <Activity size={18} />
            }
            label="Logs"
            active={
              abaAtiva === "logs"
            }
            onClick={() =>
              setAbaAtiva("logs")
            }
          />

        </div>

        <button
          onClick={sair}
          className="mt-auto bg-red-600 hover:bg-red-700 transition-all rounded-xl p-4 flex items-center gap-3 font-semibold"
        >
          <LogOut size={18} />
          Sair
        </button>

      </aside>

      {/* CONTEÚDO */}

      <section className="flex-1 p-6 lg:p-10">

        {/* TOPBAR */}

        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 mb-10">

          <div>
            <h2 className="text-4xl font-black">
              Bem-vindo,
              <span className="text-green-400">
                {" "}
                {admin?.nome}
              </span>
            </h2>

            <p className="text-gray-500 mt-2">
              Gerencie toda sua operação em tempo real.
            </p>
          </div>

          <div className="bg-[#101010] border border-white/10 rounded-2xl px-5 py-4">

            <p className="text-sm text-gray-400">
              Sistema online
            </p>

            <div className="flex items-center gap-2 mt-2">

              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />

              <p className="font-semibold text-green-400">
                Operacional
              </p>

            </div>

          </div>

        </div>

        {/* DASHBOARD */}

        {abaAtiva ===
          "dashboard" && (
          <div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">

              <CardResumo
                titulo="Clientes"
                valor={totalClientes}
              />

              <CardResumo
                titulo="Instâncias"
                valor={
                  instancias.length
                }
              />

              <CardResumo
                titulo="Receita"
                valor={`R$ ${
                  dashboard?.receita_total ||
                  0
                }`}
              />

            </div>

            <TabelaInstancias
              instancias={instancias}
              controlarInstanciaAdmin={
                controlarInstanciaAdmin
              }
            />

          </div>
        )}

        {/* CLIENTES */}

        {abaAtiva ===
          "clientes" && (
          <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">

            <h2 className="text-3xl font-black mb-6">
              Clientes
            </h2>

            <div className="space-y-4">

              {clientes.map(
                (
                  cliente: any,
                  index: number
                ) => (
                  <div
                    key={
                      cliente.id ||
                      index
                    }
                    className="bg-[#131313] border border-white/5 rounded-2xl p-5"
                  >

                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">

                      <div>
                        <h3 className="font-bold text-xl">
                          {
                            cliente.nome
                          }
                        </h3>

                        <p className="text-gray-500 mt-1">
                          {
                            cliente.email
                          }
                        </p>
                      </div>

                      <div
                        className={`px-4 py-2 rounded-full text-sm font-bold ${
                          cliente.status ===
                          "ativo"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {cliente.status ||
                          "Sem status"}
                      </div>

                    </div>

                  </div>
                )
              )}

            </div>

          </div>
        )}

        {/* INSTANCIAS */}

        {abaAtiva ===
          "instancias" && (
          <TabelaInstancias
            instancias={instancias}
            controlarInstanciaAdmin={
              controlarInstanciaAdmin
            }
          />
        )}

        {/* SAUDE */}

        {abaAtiva ===
          "saude" && (
          <div className="space-y-10">

            <section className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
              <AdminDashboardSaude
                adminToken={
                  adminToken
                }
              />
            </section>

            <section className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
              <AdminSaudeAutomacoes
                adminToken={
                  adminToken
                }
              />
            </section>

          </div>
        )}

        {/* NOTIFICACOES */}

        {abaAtiva ===
          "notificacoes" && (
          <section className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
            <AdminNotificacoes
              adminToken={
                adminToken
              }
            />
          </section>
        )}

        {/* LOGS */}

        {abaAtiva ===
          "logs" && (
          <section className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
            <AdminLogs
              adminToken={
                adminToken
              }
            />
          </section>
        )}

      </section>
    </main>
  );
}

function SidebarItem({
  icon,
  label,
  active,
  onClick,
}: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all ${
        active
          ? "bg-green-500/10 text-green-400 border border-green-500/20"
          : "hover:bg-white/5 text-gray-300"
      }`}
    >
      {icon}

      <span className="font-semibold">
        {label}
      </span>
    </button>
  );
}

function CardResumo({
  titulo,
  valor,
}: any) {
  return (
    <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">

      <p className="text-gray-500 text-sm">
        {titulo}
      </p>

      <h2 className="text-4xl font-black mt-4">
        {valor}
      </h2>

    </div>
  );
}

function TabelaInstancias({
  instancias,
  controlarInstanciaAdmin,
}: any) {
  return (
    <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">

      <div className="flex items-center justify-between mb-6">

        <div>
          <h2 className="text-2xl font-black">
            Instâncias
          </h2>

          <p className="text-gray-500 mt-1">
            Controle em tempo real
          </p>
        </div>

      </div>

      <div className="space-y-4">

        {instancias.map(
          (
            i: any,
            index: number
          ) => (
            <div
              key={
                i.instance || index
              }
              className="bg-[#131313] border border-white/5 rounded-2xl p-5"
            >

              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">

                <div>

                  <div className="flex items-center gap-3">

                    <h3 className="text-xl font-bold">
                      {i.instance}
                    </h3>

                    <div
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        i.conectado
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {i.conectado
                        ? "ONLINE"
                        : "OFFLINE"}
                    </div>

                  </div>

                  <p className="text-gray-500 mt-2">
                    {i.numero ||
                      "Sem número"}
                  </p>

                </div>

                <div className="flex flex-wrap gap-3">

                  <BotaoAcao
                    cor="blue"
                    icon={
                      <RefreshCcw size={16} />
                    }
                    texto="Atualizar"
                    onClick={() =>
                      controlarInstanciaAdmin(
                        i.instance,
                        "status"
                      )
                    }
                  />

                  <BotaoAcao
                    cor="yellow"
                    icon={
                      <QrCode size={16} />
                    }
                    texto="QR Code"
                    onClick={() =>
                      controlarInstanciaAdmin(
                        i.instance,
                        "qrcode"
                      )
                    }
                  />

                  <BotaoAcao
                    cor="purple"
                    icon={
                      <RotateCw size={16} />
                    }
                    texto="Reiniciar"
                    onClick={() =>
                      controlarInstanciaAdmin(
                        i.instance,
                        "reiniciar"
                      )
                    }
                  />

                  <BotaoAcao
                    cor="red"
                    icon={
                      <Power size={16} />
                    }
                    texto="Desconectar"
                    onClick={() =>
                      controlarInstanciaAdmin(
                        i.instance,
                        "desconectar"
                      )
                    }
                  />

                </div>

              </div>

            </div>
          )
        )}

      </div>

    </div>
  );
}

function BotaoAcao({
  icon,
  texto,
  onClick,
  cor,
}: any) {
  const cores: any = {
    blue:
      "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30",

    yellow:
      "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30",

    purple:
      "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30",

    red:
      "bg-red-500/20 text-red-400 hover:bg-red-500/30",
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${cores[cor]}`}
    >
      {icon}
      {texto}
    </button>
  );
}