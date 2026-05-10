"use client";

import {
  LayoutDashboard,
  Users,
  Server,
  Bell,
  ShieldCheck,
  Activity,
  LogOut,
  Wallet,
  UserCog,
  Package,
  LifeBuoy,
} from "lucide-react";

type Aba =
  | "dashboard"
  | "clientes"
  | "financeiro"
  | "usuarios"
  | "catalogo"
  | "instancias"
  | "notificacoes"
  | "saude"
  | "logs"
  | "suporte";

export default function AdminSidebar({
  abaAtiva,
  setAbaAtiva,
  sair,
  permissoes,
}: {
  abaAtiva: Aba;
  setAbaAtiva: (aba: Aba) => void;
  sair: () => void;
  permissoes: any;
}) {
  const podeVerResumo = Boolean(permissoes?.pode_ver_resumo);
  const podeVerClientes = Boolean(permissoes?.pode_ver_clientes);
  const podeFinanceiro = Boolean(permissoes?.pode_cobrar_clientes);
  const podeVerInstancias = Boolean(permissoes?.pode_ver_instancias);
  const podeGerenciarAdmins = Boolean(permissoes?.pode_gerenciar_admins);
  const podeGerenciarCatalogo = Boolean(permissoes?.pode_gerenciar_catalogo);

  return (
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
        {podeVerResumo && (
          <SidebarItem
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            active={abaAtiva === "dashboard"}
            onClick={() => setAbaAtiva("dashboard")}
          />
        )}

        {podeVerClientes && (
          <SidebarItem
            icon={<Users size={18} />}
            label="Clientes"
            active={abaAtiva === "clientes"}
            onClick={() => setAbaAtiva("clientes")}
          />
        )}

        {podeFinanceiro && (
          <SidebarItem
            icon={<Wallet size={18} />}
            label="Financeiro"
            active={abaAtiva === "financeiro"}
            onClick={() => setAbaAtiva("financeiro")}
          />
        )}

        {podeGerenciarCatalogo && (
          <SidebarItem
            icon={<Package size={18} />}
            label="Catálogo"
            active={abaAtiva === "catalogo"}
            onClick={() => setAbaAtiva("catalogo")}
          />
        )}

        {podeGerenciarAdmins && (
          <SidebarItem
            icon={<UserCog size={18} />}
            label="Usuários"
            active={abaAtiva === "usuarios"}
            onClick={() => setAbaAtiva("usuarios")}
          />
        )}

        {podeVerInstancias && (
          <SidebarItem
            icon={<Server size={18} />}
            label="Instâncias"
            active={abaAtiva === "instancias"}
            onClick={() => setAbaAtiva("instancias")}
          />
        )}

        <SidebarItem
          icon={<Bell size={18} />}
          label="Notificações"
          active={abaAtiva === "notificacoes"}
          onClick={() => setAbaAtiva("notificacoes")}
        />

        <SidebarItem
          icon={<ShieldCheck size={18} />}
          label="Saúde"
          active={abaAtiva === "saude"}
          onClick={() => setAbaAtiva("saude")}
        />

        <SidebarItem
          icon={<Activity size={18} />}
          label="Logs"
          active={abaAtiva === "logs"}
          onClick={() => setAbaAtiva("logs")}
        />

        <SidebarItem
          icon={<LifeBuoy size={18} />}
          label="Suporte"
          active={abaAtiva === "suporte"}
          onClick={() => setAbaAtiva("suporte")}
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