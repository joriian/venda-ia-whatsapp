"use client";

import { useState } from "react";

export default function EsqueciSenhaModal({
  aberto,
  fechar,
}: {
  aberto: boolean;
  fechar: () => void;
}) {
  const [etapa, setEtapa] = useState<"email" | "codigo" | "sucesso">(
    "email"
  );

  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [loading, setLoading] = useState(false);

  if (!aberto) return null;

  async function enviarCodigo() {
    if (!email.trim()) {
      alert("Informe o email.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "/api/cliente/esqueci-senha",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(
          data.error ||
            "Erro ao enviar código."
        );
        return;
      }

      setEtapa("codigo");

      alert(
        "Código enviado no WhatsApp cadastrado."
      );
    } catch (error) {
      console.error(error);

      alert(
        "Erro ao solicitar recuperação."
      );
    } finally {
      setLoading(false);
    }
  }

  async function redefinirSenha() {
    if (
      !codigo ||
      !novaSenha ||
      !confirmarSenha
    ) {
      alert("Preencha todos os campos.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "/api/cliente/redefinir-senha",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
            codigo,
            novaSenha,
            confirmarSenha,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(
          data.error ||
            "Erro ao redefinir senha."
        );
        return;
      }

      setEtapa("sucesso");
    } catch (error) {
      console.error(error);

      alert(
        "Erro ao redefinir senha."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-green-400 text-sm font-bold uppercase tracking-wider">
              Recuperação segura
            </p>

            <h2 className="text-3xl font-black mt-2">
              Esqueci minha senha
            </h2>
          </div>

          <button
            onClick={fechar}
            className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {etapa === "email" && (
            <div>
              <p className="text-gray-400 mb-5">
                Informe o email da conta.
                O código será enviado para o
                WhatsApp cadastrado.
              </p>

              <div className="grid gap-4">
                <input
                  type="email"
                  placeholder="Seu email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-700 focus:border-green-500 outline-none"
                />

                <button
                  onClick={enviarCodigo}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 py-4 rounded-2xl font-black"
                >
                  {loading
                    ? "Enviando..."
                    : "Enviar código"}
                </button>
              </div>
            </div>
          )}

          {etapa === "codigo" && (
            <div>
              <p className="text-gray-400 mb-5">
                Digite o código recebido no
                WhatsApp e escolha sua nova
                senha.
              </p>

              <div className="grid gap-4">
                <input
                  type="text"
                  placeholder="Código recebido"
                  value={codigo}
                  onChange={(e) =>
                    setCodigo(
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6)
                    )
                  }
                  className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-700 focus:border-green-500 outline-none"
                />

                <input
                  type="password"
                  placeholder="Nova senha"
                  value={novaSenha}
                  onChange={(e) =>
                    setNovaSenha(
                      e.target.value
                    )
                  }
                  className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-700 focus:border-green-500 outline-none"
                />

                <input
                  type="password"
                  placeholder="Confirmar nova senha"
                  value={confirmarSenha}
                  onChange={(e) =>
                    setConfirmarSenha(
                      e.target.value
                    )
                  }
                  className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-700 focus:border-green-500 outline-none"
                />

                <button
                  onClick={redefinirSenha}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 py-4 rounded-2xl font-black"
                >
                  {loading
                    ? "Redefinindo..."
                    : "Redefinir senha"}
                </button>
              </div>
            </div>
          )}

          {etapa === "sucesso" && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center mx-auto text-4xl font-black mb-5">
                ✓
              </div>

              <h3 className="text-3xl font-black">
                Senha alterada
              </h3>

              <p className="text-gray-400 mt-4">
                Sua senha foi redefinida com
                sucesso.
              </p>

              <button
                onClick={fechar}
                className="mt-6 bg-green-600 hover:bg-green-700 px-6 py-4 rounded-2xl font-black"
              >
                Voltar ao login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}