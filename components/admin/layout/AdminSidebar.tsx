"use client";

import {
  LayoutDashboard,
  Users,
  Server,
  Bell,
  ShieldCheck,
  Activity,
  LogOut,
} from "lucide-react";

type Aba =
  | "dashboard"
  | "clientes"
  | "instancias"
  | "notificacoes"
  | "saude"
  | "logs";

export default function AdminSidebar({
  abaAtiva,
  setAbaAtiva,
  sair,
}: {
  abaAtiva: Aba;
  setAbaAtiva: (aba: Aba) => void;
  sair: () => void;
}) {
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
        <SidebarItem
          icon={<LayoutDashboard size={18} />}
          label="Dashboard"
          active={abaAtiva === "dashboard"}
          onClick={() => setAbaAtiva("dashboard")}
        />

        <SidebarItem
          icon={<Users size={18} />}
          label="Clientes"
          active={abaAtiva === "clientes"}
          onClick={() => setAbaAtiva("clientes")}
        />

        <SidebarItem
          icon={<Server size={18} />}
          label="Instâncias"
          active={abaAtiva === "instancias"}
          onClick={() => setAbaAtiva("instancias")}
        />

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
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
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