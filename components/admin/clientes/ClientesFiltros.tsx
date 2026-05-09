"use client";

export default function ClientesFiltros({
  busca,
  setBusca,
  filtroStatus,
  setFiltroStatus,
}: any) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 mb-6">

      <input
        type="text"
        placeholder="Pesquisar cliente..."
        value={busca}
        onChange={(e) =>
          setBusca(e.target.value)
        }
        className="flex-1 bg-[#111] border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-green-500"
      />

      <select
        value={filtroStatus}
        onChange={(e) =>
          setFiltroStatus(e.target.value)
        }
        className="bg-[#111] border border-white/10 rounded-2xl px-5 py-4 outline-none"
      >
        <option value="todos">
          Todos
        </option>

        <option value="ativo">
          Ativos
        </option>

        <option value="bloqueado">
          Bloqueados
        </option>

        <option value="suspenso">
          Suspensos
        </option>
      </select>

    </div>
  );
}