"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminVerificacaoWhatsappPage() {
  const router = useRouter();

  const [adminToken, setAdminToken] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [numero, setNumero] = useState("");
  const [ativo, setAtivo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adminToken") || "";

    if (!token) {
      router.replace("/admin/login");
      return;
    }

    setAdminToken(token);
    carregar(token);
  }, [router]);

  async function carregar(token: string) {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/configuracao-verificacao", {
        headers: {
          "x-admin-token": token,
        },
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.error || "Erro ao carregar configuração.");
        return;
      }

      setInstanceName(data.configuracao?.instance_name || "");
      setNumero(data.configuracao?.numero || "");
      setAtivo(Boolean(data.configuracao?.ativo));
    } catch (error) {
      console.log(error);
      alert("Erro ao carregar configuração.");
    } finally {
      setLoading(false);
    }
  }

  async function salvar() {
    if (!instanceName.trim()) {
      alert("Informe o nome da instância Evolution.");
      return;
    }

    if (!numero.trim()) {
      alert("Informe o número remetente.");
      return;
    }

    try {
      setSalvando(true);

      const res = await fetch("/api/admin/configuracao-verificacao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          instance_name: instanceName.trim(),
          numero: numero.trim(),
          ativo,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.error || "Erro ao salvar configuração.");
        return;
      }

      alert("Número de verificação salvo com sucesso.");
    } catch (error) {
      console.log(error);
      alert("Erro ao salvar configuração.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Carregando...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => router.push("/admin")}
          className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-4 py-3 rounded-2xl font-bold"
        >
          Voltar ao admin
        </button>

        <section className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6">
          <h1 className="text-3xl font-black">
            Número de verificação
          </h1>

          <p className="text-gray-400 mt-2">
            Configure a instância da Evolution API que será usada para enviar códigos de verificação aos clientes.
          </p>
        </section>

        <section className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Nome da instância Evolution
            </label>

            <input
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="Ex: nexora-verificacao"
              className="w-full p-4 rounded-2xl bg-zinc-800 border border-zinc-700"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Número remetente
            </label>

            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Ex: 5599999999999"
              className="w-full p-4 rounded-2xl bg-zinc-800 border border-zinc-700"
            />
          </div>

          <label className="flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-2xl p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="w-5 h-5"
            />

            <span className="font-bold">
              Ativar este número para envio de códigos
            </span>
          </label>

          <button
            onClick={salvar}
            disabled={salvando}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 py-4 rounded-2xl font-bold"
          >
            {salvando ? "Salvando..." : "Salvar configuração"}
          </button>
        </section>
      </div>
    </main>
  );
}