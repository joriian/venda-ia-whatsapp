"use client";

import { useEffect, useState } from "react";

type Permissao = {
  id?: string;
  nivel: string;
  pode_ver_resumo: boolean;
  pode_gerenciar_catalogo: boolean;
  pode_gerenciar_cupons: boolean;
  pode_ver_clientes: boolean;
  pode_bloquear_clientes: boolean;
  pode_cobrar_clientes: boolean;
  pode_ver_instancias: boolean;
  pode_gerenciar_admins: boolean;
  pode_acessar_cliente: boolean;
};

export default function AdminUsuarios({ adminToken }: { adminToken: string }) {
  const [aba, setAba] = useState<"usuarios" | "permissoes">("usuarios");
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [loading, setLoading] = useState(true);

  const [novo, setNovo] = useState({
    nome: "",
    email: "",
    senha: "",
    nivel: "suporte",
  });

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    setLoading(true);

    await Promise.all([
      carregarUsuarios(),
      carregarPermissoes(),
    ]);

    setLoading(false);
  }

  async function carregarUsuarios() {
    try {
      const res = await fetch("/api/admin/usuarios", {
        headers: {
          "x-admin-token": adminToken,
        },
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.error || "Erro ao carregar usuários");
        return;
      }

      setUsuarios(data.usuarios || []);
    } catch (error) {
      console.log(error);
    }
  }

  async function carregarPermissoes() {
    try {
      const res = await fetch("/api/admin/permissoes", {
        headers: {
          "x-admin-token": adminToken,
        },
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        return;
      }

      setPermissoes(data.permissoes || []);
    } catch (error) {
      console.log(error);
    }
  }

  async function criarUsuario() {
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          acao: "criar",
          ...novo,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.error || "Erro ao criar usuário");
        return;
      }

      alert("Usuário criado.");

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

  async function alterarStatus(usuario: any) {
    try {
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
          ativo: !usuario.ativo,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.error || "Erro ao alterar status");
        return;
      }

      carregarUsuarios();
    } catch (error) {
      console.log(error);
    }
  }

  async function resetarSenha(usuario: any) {
    const novaSenha = prompt(`Nova senha para ${usuario.nome}`);

    if (!novaSenha) return;

    try {
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
        alert(data.error || "Erro ao alterar senha");
        return;
      }

      alert("Senha alterada.");
    } catch (error) {
      console.log(error);
    }
  }

  async function salvarPermissao(permissao: Permissao) {
    try {
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
        alert(data.error || "Erro ao salvar permissões");
        return;
      }

      alert("Permissões atualizadas.");
      carregarPermissoes();
    } catch (error) {
      console.log(error);
    }
  }

  function atualizarPermissao(
    nivel: string,
    campo: keyof Permissao,
    valor: boolean
  ) {
    setPermissoes((old) =>
      old.map((p) =>
        p.nivel === nivel
          ? {
              ...p,
              [campo]: valor,
            }
          : p
      )
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div>
            <h2 className="text-3xl font-black">
              Usuários e Permissões
            </h2>

            <p className="text-gray-500 mt-2">
              Gerencie administradores, níveis e acessos do painel.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setAba("usuarios")}
              className={`px-5 py-3 rounded-2xl font-bold ${
                aba === "usuarios"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-white/5 text-gray-300"
              }`}
            >
              Usuários
            </button>

            <button
              onClick={() => setAba("permissoes")}
              className={`px-5 py-3 rounded-2xl font-bold ${
                aba === "permissoes"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-white/5 text-gray-300"
              }`}
            >
              Permissões
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-gray-500">
          Carregando...
        </div>
      )}

      {!loading && aba === "usuarios" && (
        <>
          <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
            <h3 className="text-2xl font-black">
              Criar novo usuário
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <input
                placeholder="Nome"
                value={novo.nome}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    nome: e.target.value,
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
                    email: e.target.value,
                  })
                }
                className="bg-[#131313] border border-white/10 rounded-2xl px-4 py-3 outline-none"
              />

              <input
                placeholder="Senha forte"
                value={novo.senha}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    senha: e.target.value,
                  })
                }
                className="bg-[#131313] border border-white/10 rounded-2xl px-4 py-3 outline-none"
              />

              <select
                value={novo.nivel}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    nivel: e.target.value,
                  })
                }
                className="bg-[#131313] border border-white/10 rounded-2xl px-4 py-3 outline-none"
              >
                <option value="suporte">Suporte</option>
                <option value="financeiro">Financeiro</option>
                <option value="admin">Admin</option>
                <option value="dono">Dono</option>
              </select>
            </div>

            <button
              onClick={criarUsuario}
              className="mt-5 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-2xl font-bold"
            >
              Criar usuário
            </button>
          </div>

          <div className="space-y-5">
            {usuarios.map((usuario: any) => (
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

                      <StatusUsuario ativo={usuario.ativo} />
                    </div>

                    <div className="flex flex-wrap gap-3 mt-4">
                      <Info label="Email" value={usuario.email} />
                      <Info label="Nível" value={usuario.nivel} />
                      <Info
                        label="Criado"
                        value={
                          usuario.created_at
                            ? new Date(usuario.created_at).toLocaleDateString(
                                "pt-BR"
                              )
                            : "-"
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => resetarSenha(usuario)}
                      className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 px-4 py-3 rounded-xl font-bold"
                    >
                      Alterar senha
                    </button>

                    <button
                      onClick={() => alterarStatus(usuario)}
                      className={`px-4 py-3 rounded-xl font-bold ${
                        usuario.ativo
                          ? "bg-red-500/20 text-red-400"
                          : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {usuario.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && aba === "permissoes" && (
        <div className="space-y-5">
          {permissoes.map((permissao) => (
            <div
              key={permissao.nivel}
              className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6"
            >
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 mb-6">
                <div>
                  <h3 className="text-2xl font-black capitalize">
                    {permissao.nivel}
                  </h3>

                  <p className="text-gray-500 mt-1">
                    Controle o que este nível pode acessar.
                  </p>
                </div>

                <button
                  onClick={() => salvarPermissao(permissao)}
                  disabled={permissao.nivel === "dono"}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 px-5 py-3 rounded-2xl font-bold"
                >
                  Salvar permissões
                </button>
              </div>

              {permissao.nivel === "dono" && (
                <div className="mb-5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl p-4">
                  O nível dono possui acesso total e não pode ser alterado.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <PermissaoCheck
                  label="Ver resumo"
                  checked={permissao.pode_ver_resumo}
                  disabled={permissao.nivel === "dono"}
                  onChange={(v) =>
                    atualizarPermissao(
                      permissao.nivel,
                      "pode_ver_resumo",
                      v
                    )
                  }
                />

                <PermissaoCheck
                  label="Gerenciar catálogo"
                  checked={permissao.pode_gerenciar_catalogo}
                  disabled={permissao.nivel === "dono"}
                  onChange={(v) =>
                    atualizarPermissao(
                      permissao.nivel,
                      "pode_gerenciar_catalogo",
                      v
                    )
                  }
                />

                <PermissaoCheck
                  label="Gerenciar cupons"
                  checked={permissao.pode_gerenciar_cupons}
                  disabled={permissao.nivel === "dono"}
                  onChange={(v) =>
                    atualizarPermissao(
                      permissao.nivel,
                      "pode_gerenciar_cupons",
                      v
                    )
                  }
                />

                <PermissaoCheck
                  label="Ver clientes"
                  checked={permissao.pode_ver_clientes}
                  disabled={permissao.nivel === "dono"}
                  onChange={(v) =>
                    atualizarPermissao(
                      permissao.nivel,
                      "pode_ver_clientes",
                      v
                    )
                  }
                />

                <PermissaoCheck
                  label="Bloquear clientes"
                  checked={permissao.pode_bloquear_clientes}
                  disabled={permissao.nivel === "dono"}
                  onChange={(v) =>
                    atualizarPermissao(
                      permissao.nivel,
                      "pode_bloquear_clientes",
                      v
                    )
                  }
                />

                <PermissaoCheck
                  label="Cobrar clientes"
                  checked={permissao.pode_cobrar_clientes}
                  disabled={permissao.nivel === "dono"}
                  onChange={(v) =>
                    atualizarPermissao(
                      permissao.nivel,
                      "pode_cobrar_clientes",
                      v
                    )
                  }
                />

                <PermissaoCheck
                  label="Ver instâncias"
                  checked={permissao.pode_ver_instancias}
                  disabled={permissao.nivel === "dono"}
                  onChange={(v) =>
                    atualizarPermissao(
                      permissao.nivel,
                      "pode_ver_instancias",
                      v
                    )
                  }
                />

                <PermissaoCheck
                  label="Gerenciar admins"
                  checked={permissao.pode_gerenciar_admins}
                  disabled={permissao.nivel === "dono"}
                  onChange={(v) =>
                    atualizarPermissao(
                      permissao.nivel,
                      "pode_gerenciar_admins",
                      v
                    )
                  }
                />

                <PermissaoCheck
                  label="Acessar painel do cliente"
                  checked={permissao.pode_acessar_cliente}
                  disabled={permissao.nivel === "dono"}
                  onChange={(v) =>
                    atualizarPermissao(
                      permissao.nivel,
                      "pode_acessar_cliente",
                      v
                    )
                  }
                />
              </div>
            </div>
          ))}

          {permissoes.length === 0 && (
            <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-10 text-center text-gray-500">
              Nenhuma permissão encontrada.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusUsuario({ ativo }: { ativo: boolean }) {
  return (
    <div
      className={`px-4 py-2 rounded-full text-sm font-bold ${
        ativo
          ? "bg-green-500/20 text-green-400"
          : "bg-red-500/20 text-red-400"
      }`}
    >
      {ativo ? "ATIVO" : "INATIVO"}
    </div>
  );
}

function Info({ label, value }: any) {
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

function PermissaoCheck({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (valor: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="bg-[#131313] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 cursor-pointer">
      <span className="font-bold">
        {label}
      </span>

      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 accent-green-500"
      />
    </label>
  );
}