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

  const [admin, setAdmin] =
    useState<AnyObj>(null);

  const [adminToken, setAdminToken] =
    useState("");

  const [
    carregandoSessao,
    setCarregandoSessao,
  ] = useState(true);

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

        setClientes(
          data.clientes || []
        );

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

        if (!Array.isArray(data)) {
          return;
        }

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

          router.replace(
            "/admin/login"
          );

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

        const data =
          await res.json();

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

        router.replace(
          "/admin/login"
        );

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

    if (iniciouRef.current) {
      return;
    }

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

      const data =
        await res.json();

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

    router.replace(
      "/admin/login"
    );
  }

  const totalClientes =
    useMemo(() => {
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
        setAbaAtiva={setAbaAtiva}
        sair={sair}
      />

      <section className="flex-1 p-6 lg:p-10">

        <AdminTopbar
          admin={admin}
        />

        {abaAtiva ===
          "dashboard" && (
          <div>

            <AdminResumoCards
              totalClientes={
                totalClientes
              }
              totalInstancias={
                instancias.length
              }
              receita={
                dashboard?.receita_total ||
                0
              }
            />

            <AdminInstanciasTable
              instancias={
                instancias
              }
              controlarInstanciaAdmin={
                controlarInstanciaAdmin
              }
            />

          </div>
        )}

        {abaAtiva ===
          "instancias" && (
          <AdminInstanciasTable
            instancias={
              instancias
            }
            controlarInstanciaAdmin={
              controlarInstanciaAdmin
            }
          />
        )}

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

        {abaAtiva ===
          "clientes" && (
          <section className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">

            <h2 className="text-3xl font-black">
              Clientes
            </h2>

            <p className="text-gray-500 mt-2">
              Módulo clientes será separado em componente.
            </p>

          </section>
        )}

      </section>

    </main>
  );
}