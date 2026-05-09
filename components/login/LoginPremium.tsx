"use client";

import Image from "next/image";
import { useState } from "react";
import EsqueciSenhaModal from "@/components/login/EsqueciSenhaModal";

export default function LoginPremium() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [loading, setLoading] = useState(false);

  const [modalRecuperacao, setModalRecuperacao] =
    useState(false);

  async function entrar(e: any) {
    e.preventDefault();

    if (!email || !senha) {
      alert("Preencha email e senha.");
      return;
    }

    setLoading(true);

    try {
const res = await fetch("/api/cliente/login", {
  credentials: "include",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          email,
          senha,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(
          data.error ||
            "Erro ao fazer login."
        );
        return;
      }

      if (data.token) {
        localStorage.setItem(
          "clienteToken",
          data.token
        );

        document.cookie = `clienteToken=${data.token}; path=/; max-age=2592000`;
      }

      if (data.cliente?.id) {
        localStorage.setItem(
          "clienteId",
          data.cliente.id
        );
      }

      if (data.cliente?.nome) {
        localStorage.setItem(
          "clienteNome",
          data.cliente.nome
        );
      }

      if (data.cliente?.email) {
        localStorage.setItem(
          "clienteEmail",
          data.cliente.email
        );
      }

      window.location.href = "/cliente";
    } catch (error) {
      console.error(error);

      alert("Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.15),transparent_40%)]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_35%)]" />

      <div className="relative z-10 min-h-screen grid grid-cols-1 xl:grid-cols-2">
        <section className="hidden xl:flex flex-col justify-between p-12 border-r border-zinc-800 bg-zinc-950/40">
          <div>
            <div className="flex items-center gap-4 mb-10">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden">
                <Image
                  src="/nexora-logo.png"
                  alt="Nexora"
                  width={56}
                  height={56}
                  className="object-contain"
                  priority
                />
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-wide">
                  NEXORA
                </h1>

                <p className="text-gray-500 text-sm">
                  Plataforma de automações com IA
                </p>
              </div>
            </div>

            <div className="max-w-xl">
              <p className="text-green-400 font-bold uppercase tracking-widest text-sm mb-4">
                Área segura do cliente
              </p>

              <h2 className="text-5xl font-black leading-tight">
                Gerencie suas automações
                WhatsApp em um só painel.
              </h2>

              <p className="text-gray-400 mt-6 text-lg leading-relaxed">
                Controle instâncias,
                pagamentos, planos, QR
                Codes, conexões Evolution,
                verificações e monitoramento
                em tempo real.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-12">
              <InfoCard
                titulo="Conexões separadas"
                texto="Cada serviço possui sua própria instância WhatsApp."
              />

              <InfoCard
                titulo="Monitoramento"
                texto="Acompanhe pagamentos, status e automações."
              />

              <InfoCard
                titulo="QR Code em tempo real"
                texto="Reconecte rapidamente seus serviços."
              />

              <InfoCard
                titulo="Segurança"
                texto="Validação de WhatsApp e autenticação protegida."
              />
            </div>
          </div>

          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} Nexora.
            Todos os direitos reservados.
          </p>
        </section>

        <section className="flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="xl:hidden flex items-center justify-center gap-4 mb-10">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden">
                <Image
                  src="/nexora-logo.png"
                  alt="Nexora"
                  width={56}
                  height={56}
                  className="object-contain"
                  priority
                />
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-wide">
                  NEXORA
                </h1>

                <p className="text-gray-500 text-sm">
                  Plataforma IA WhatsApp
                </p>
              </div>
            </div>

            <div className="bg-zinc-950/80 border border-zinc-800 backdrop-blur rounded-[2rem] p-8 shadow-2xl">
              <div className="mb-8">
                <p className="text-green-400 font-bold text-sm uppercase tracking-wider">
                  Login seguro
                </p>

                <h2 className="text-4xl font-black mt-3">
                  Entrar na plataforma
                </h2>

                <p className="text-gray-400 mt-3">
                  Acesse sua área do cliente
                  Nexora.
                </p>
              </div>

              <form
                onSubmit={entrar}
                className="grid gap-4"
              >
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="seuemail@exemplo.com"
                    className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-700 focus:border-green-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    Senha
                  </label>

                  <input
                    type="password"
                    value={senha}
                    onChange={(e) =>
                      setSenha(e.target.value)
                    }
                    placeholder="Digite sua senha"
                    className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-700 focus:border-green-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 py-4 rounded-2xl font-black text-lg transition-all"
                >
                  {loading
                    ? "Entrando..."
                    : "Entrar"}
                </button>
              </form>

              <div className="mt-6 flex flex-col gap-3">
                <a
                  href="/"
                  className="text-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 py-3 rounded-2xl font-bold"
                >
                  Criar conta
                </a>

                <button
                  type="button"
                  onClick={() =>
                    setModalRecuperacao(true)
                  }
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Esqueci minha senha
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-800">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Ambiente protegido
                  </span>

                  <span>
                    WhatsApp verificado
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <EsqueciSenhaModal
        aberto={modalRecuperacao}
        fechar={() =>
          setModalRecuperacao(false)
        }
      />
    </main>
  );
}

function InfoCard({
  titulo,
  texto,
}: {
  titulo: string;
  texto: string;
}) {
  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-5">
      <h3 className="font-bold text-lg">
        {titulo}
      </h3>

      <p className="text-gray-400 text-sm mt-2 leading-relaxed">
        {texto}
      </p>
    </div>
  );
}