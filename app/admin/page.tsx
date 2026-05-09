"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import AdminCatalogo from "@/components/admin/AdminCatalogo";
import AdminLogs from "@/components/admin/AdminLogs";
import AdminSaudeAutomacoes from "@/components/admin/AdminSaudeAutomacoes";
import AdminNotificacoes from "@/components/admin/AdminNotificacoes";
import AdminDashboardSaude from "@/components/admin/AdminDashboardSaude";

type AnyObj = any;

export default function AdminPage() {
  const router = useRouter();

  const [admin, setAdmin] = useState<AnyObj>(null);
  const [adminToken, setAdminToken] = useState("");
  const [carregandoSessao, setCarregandoSessao] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const iniciouRef = useRef(false);

  const [clientes, setClientes] = useState<any[]>([]);
  const [instancias, setInstancias] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);

  function limparSessaoAdmin() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminNome");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("adminNivel");
    localStorage.removeItem("adminSessaoExpira");
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

      setDashboard((old: any) => {
        const oldString = JSON.stringify(old);
        const newString = JSON.stringify(data);

        if (oldString === newString) return old;

        return data;
      });
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

      setClientes((old) => {
        const oldString = JSON.stringify(old);
        const newString = JSON.stringify(data.clientes || []);

        if (oldString === newString) return old;

        return data.clientes || [];
      });
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

      const ordenado = [...data].sort((a, b) => {
        if (a.conectado && !b.conectado) return -1;
        if (!a.conectado && b.conectado) return 1;

        return String(a.instance || "").localeCompare(
          String(b.instance || "")
        );
      });

      setInstancias((old) => {
        const oldString = JSON.stringify(old);
        const newString = JSON.stringify(ordenado);

        if (oldString === newString) return old;

        return ordenado;
      });
    } catch (error) {
      console.log(error);
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

      await Promise.all([
        carregarDashboard(token),
        carregarClientes(token),
        carregarInstancias(),
      ]);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(async () => {
        try {
          await Promise.all([
            carregarDashboard(token),
            carregarClientes(token),
            carregarInstancias(),
          ]);
        } catch (error) {
          console.log(error);
        }
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
        clearInterval(intervalRef.current);
      }
    };
  }, [iniciarAdmin]);

  async function controlarInstanciaAdmin(
    instanceName: string,
    acao: "status" | "qrcode" | "reiniciar" | "desconectar"
  ) {
    if (!instanceName) return;

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
        alert(data.error || "Erro ao controlar instância.");
        return;
      }

      await carregarInstancias();

      if (acao === "status") {
        alert("Status atualizado.");
      }

      if (acao === "qrcode") {
        alert("QR Code solicitado.");
      }

      if (acao === "reiniciar") {
        alert("Instância reiniciada.");
      }

      if (acao === "desconectar") {
        alert("Instância desconectada.");
      }

    } catch (error) {
      console.log(error);
      alert("Erro ao controlar instância.");
    }
  }

  async function sair() {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
      });
    } catch {}

    limparSessaoAdmin();

    router.replace("/admin/login");
  }

  const totalClientes = useMemo(() => {
    return clientes.length;
  }, [clientes]);

  if (carregandoSessao) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Validando sessão...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            Painel Admin
          </h1>

          <p className="text-gray-400 mt-1">
            {admin?.nome}
          </p>
        </div>

        <button
          onClick={sair}
          className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded-lg font-bold"
        >
          Sair
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
          <p className="text-gray-400 text-sm">
            Clientes
          </p>

          <p className="text-2xl font-bold mt-2">
            {totalClientes}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
          <p className="text-gray-400 text-sm">
            Instâncias
          </p>

          <p className="text-2xl font-bold mt-2">
            {instancias.length}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
          <p className="text-gray-400 text-sm">
            Receita
          </p>

          <p className="text-2xl font-bold mt-2">
            R$ {dashboard?.receita_total || 0}
          </p>
        </div>
      </div>

      <TabelaInstancias
        instancias={instancias}
        controlarInstanciaAdmin={controlarInstanciaAdmin}
      />
    </main>
  );
}

function TabelaInstancias({
  instancias,
  controlarInstanciaAdmin,
}: any) {
  return (
    <div className="grid gap-4">
      {instancias.map((i: any, index: number) => (
        <div
          key={i.instance || index}
          className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4"
        >
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg">
                {i.instance}
              </h3>

              <p className="text-gray-400 text-sm">
                {i.numero || "-"}
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() =>
                  controlarInstanciaAdmin(i.instance, "status")
                }
                className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded"
              >
                Atualizar
              </button>

              <button
                onClick={() =>
                  controlarInstanciaAdmin(i.instance, "qrcode")
                }
                className="bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded"
              >
                QR Code
              </button>

              <button
                onClick={() =>
                  controlarInstanciaAdmin(i.instance, "reiniciar")
                }
                className="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded"
              >
                Reiniciar
              </button>

              <button
                onClick={() =>
                  controlarInstanciaAdmin(i.instance, "desconectar")
                }
                className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded"
              >
                Desconectar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}