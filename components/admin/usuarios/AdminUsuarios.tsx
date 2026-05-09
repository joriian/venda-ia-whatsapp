"use client";

import {
  useEffect,
  useState,
} from "react";

export default function AdminUsuarios({
  adminToken,
}: {
  adminToken: string;
}) {
  const [usuarios, setUsuarios] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [novo, setNovo] =
    useState({
      nome: "",
      email: "",
      senha: "",
      nivel: "suporte",
    });

  async function carregarUsuarios() {
    try {
      setLoading(true);

      const res = await fetch(
        "/api/admin/usuarios",
        {
          headers: {
            "x-admin-token":
              adminToken,
          },
        }
      );

      const data =
        await res.json();

      if (!res.ok || data.error) {
        alert(
          data.error ||
            "Erro ao carregar usuários"
        );

        return;
      }

      setUsuarios(
        data.usuarios || []
      );

    } catch (error) {

      console.log(error);

    } finally {

      setLoading(false);

    }
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function criarUsuario() {
    try {

      const res = await fetch(
        "/api/admin/usuarios",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-admin-token":
              adminToken,
          },

          body: JSON.stringify({
            acao: "criar",
            ...novo,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok || data.error) {

        alert(
          data.error ||
            "Erro ao criar usuário"
        );

        return;
      }

      alert(
        "Usuário criado."
      );

      setNovo({
        nome: "",
        email: "",
        senha: "",
        nivel: "suporte",
      });

      carregarUsuarios();

    } catch (error) {

      console.log(error);

    }
  }

  async function alterarStatus(
    usuario: any
  ) {
    try {

      const res = await fetch(
        "/api/admin/usuarios",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-admin-token":
              adminToken,
          },

          body: JSON.stringify({
            acao: "atualizar",

            id: usuario.id,

            nome: usuario.nome,

            email: usuario.email,

            nivel: usuario.nivel,

            ativo:
              !usuario.ativo,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok || data.error) {

        alert(
          data.error ||
            "Erro ao alterar status"
        );

        return;
      }

      carregarUsuarios();

    } catch (error) {

      console.log(error);

    }
  }

  async function resetarSenha(
    usuario: any
  ) {
    const novaSenha =
      prompt(
        `Nova senha para ${usuario.nome}`
      );

    if (!novaSenha) return;

    try {

      const res = await fetch(
        "/api/admin/usuarios",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-admin-token":
              adminToken,
          },

          body: JSON.stringify({
            acao:
              "alterar_senha",

            id: usuario.id,

            novaSenha,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok || data.error) {

        alert(
          data.error ||
            "Erro ao alterar senha"
        );

        return;
      }

      alert(
        "Senha alterada."
      );

    } catch (error) {

      console.log(error);

    }
  }

  return (
    <div className="space-y-6">

      {/* CRIAR */}

      <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">

        <h2 className="text-3xl font-black">
          Usuários Admin
        </h2>

        <p className="text-gray-500 mt-2">
          Gerencie administradores e níveis de acesso.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">

          <input
            placeholder="Nome"
            value={novo.nome}
            onChange={(e) =>
              setNovo({
                ...novo,
                nome:
                  e.target.value,
              })
            }
            className="bg-[#131313] border border-white/10 rounded-2xl px-4 py-3 outline-none"
          />

          <input
            placeholder="Email"
            value={novo.email}
            onChange={(e) =>
              setNovo({
                ...novo,
                email:
                  e.target.value,
              })
            }
            className="bg-[#131313] border border-white/10 rounded-2xl px-4 py-3 outline-none"
          />

          <input
            placeholder="Senha"
            value={novo.senha}
            onChange={(e) =>
              setNovo({
                ...novo,
                senha:
                  e.target.value,
              })
            }
            className="bg-[#131313] border border-white/10 rounded-2xl px-4 py-3 outline-none"
          />

          <select
            value={novo.nivel}
            onChange={(e) =>
              setNovo({
                ...novo,
                nivel:
                  e.target.value,
              })
            }
            className="bg-[#131313] border border-white/10 rounded-2xl px-4 py-3 outline-none"
          >
            <option value="suporte">
              Suporte
            </option>

            <option value="financeiro">
              Financeiro
            </option>

            <option value="admin">
              Admin
            </option>

            <option value="dono">
              Dono
            </option>
          </select>

        </div>

        <button
          onClick={criarUsuario}
          className="mt-5 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-2xl font-bold"
        >
          Criar usuário
        </button>

      </div>

      {/* USUARIOS */}

      <div className="space-y-5">

        {loading && (
          <div className="text-gray-500">
            Carregando...
          </div>
        )}

        {usuarios.map(
          (usuario: any) => (
            <div
              key={usuario.id}
              className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6"
            >

              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">

                <div>

                  <div className="flex items-center gap-3 flex-wrap">

                    <h3 className="text-2xl font-black">
                      {usuario.nome}
                    </h3>

                    <StatusUsuario
                      ativo={
                        usuario.ativo
                      }
                    />

                  </div>

                  <div className="flex flex-wrap gap-3 mt-4">

                    <Info
                      label="Email"
                      value={
                        usuario.email
                      }
                    />

                    <Info
                      label="Nível"
                      value={
                        usuario.nivel
                      }
                    />

                    <Info
                      label="Criado"
                      value={new Date(
                        usuario.created_at
                      ).toLocaleDateString(
                        "pt-BR"
                      )}
                    />

                  </div>

                </div>

                <div className="flex flex-wrap gap-3">

                  <button
                    onClick={() =>
                      resetarSenha(
                        usuario
                      )
                    }
                    className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 px-4 py-3 rounded-xl font-bold"
                  >
                    Alterar senha
                  </button>

                  <button
                    onClick={() =>
                      alterarStatus(
                        usuario
                      )
                    }
                    className={`px-4 py-3 rounded-xl font-bold ${
                      usuario.ativo
                        ? "bg-red-500/20 text-red-400"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {usuario.ativo
                      ? "Desativar"
                      : "Ativar"}
                  </button>

                </div>

              </div>

            </div>
          )
        )}

      </div>

    </div>
  );
}

function StatusUsuario({
  ativo,
}: {
  ativo: boolean;
}) {
  return (
    <div
      className={`px-4 py-2 rounded-full text-sm font-bold ${
        ativo
          ? "bg-green-500/20 text-green-400"
          : "bg-red-500/20 text-red-400"
      }`}
    >
      {ativo
        ? "ATIVO"
        : "INATIVO"}
    </div>
  );
}

function Info({
  label,
  value,
}: any) {
  return (
    <div className="bg-[#131313] border border-white/5 rounded-2xl p-4">

      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="font-bold mt-1">
        {value}
      </p>

    </div>
  );
}