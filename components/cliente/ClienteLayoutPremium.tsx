"use client";

import Image from "next/image";

export default function ClienteLayoutPremium({
  cliente,
  aba,
  setAba,
  children,
  onAtualizar,
  onSair,
}: any) {
  const menu = [
    ["resumo", "Resumo"],
    ["whatsapp", "WhatsApp"],
    ["servicos", "Meus serviços"],
    ["planos", "Contratar planos"],
    ["pagamentos", "Pagamentos"],
    ["logs", "Logs IA"],
    ["conta", "Minha conta"],
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen">
        <aside className="hidden xl:flex w-72 shrink-0 border-r border-zinc-800 bg-zinc-950/90 p-5 flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden">
              <Image
                src="/nexora-logo.png"
                alt="Nexora"
                width={44}
                height={44}
                className="object-contain"
                priority
              />
            </div>

            <div>
              <h1 className="font-black text-xl tracking-wide">NEXORA</h1>
              <p className="text-xs text-gray-500">Área do cliente</p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 mb-5">
            <p className="text-gray-500 text-xs mb-1">Cliente</p>
            <p className="font-bold break-words">{cliente?.nome || "Cliente"}</p>
            <p className="text-gray-500 text-xs break-all mt-1">
              {cliente?.email || "-"}
            </p>
          </div>

          <nav className="grid gap-2">
            {menu.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setAba(id)}
                className={`text-left px-4 py-3 rounded-2xl font-bold text-sm transition ${
                  aba === id
                    ? "bg-green-600 text-white shadow-lg shadow-green-950/40"
                    : "bg-zinc-900 text-gray-300 hover:bg-zinc-800"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-auto grid gap-2">
            <button
              onClick={onAtualizar}
              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-3 rounded-2xl font-bold text-sm"
            >
              Atualizar painel
            </button>

            <button
              onClick={onSair}
              className="bg-red-600 hover:bg-red-700 px-4 py-3 rounded-2xl font-bold text-sm"
            >
              Sair
            </button>
          </div>
        </aside>

        <section className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 bg-black/80 backdrop-blur border-b border-zinc-800">
            <div className="px-4 md:px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="text-green-400 font-bold text-xs uppercase tracking-wider">
                  Painel do cliente
                </p>
                <h2 className="text-2xl md:text-3xl font-black mt-1">
                  Olá, {cliente?.nome || "cliente"}
                </h2>
                <p className="text-gray-500 text-sm break-all">
                  {cliente?.email || "-"}
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={onAtualizar}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-4 py-3 rounded-2xl font-bold text-sm"
                >
                  Atualizar
                </button>

                <button
                  onClick={onSair}
                  className="bg-red-600 hover:bg-red-700 px-4 py-3 rounded-2xl font-bold text-sm"
                >
                  Sair
                </button>
              </div>

              <nav className="xl:hidden flex gap-2 overflow-x-auto pb-1">
                {menu.map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setAba(id)}
                    className={`whitespace-nowrap px-4 py-3 rounded-2xl font-bold text-sm ${
                      aba === id
                        ? "bg-green-600 text-white"
                        : "bg-zinc-900 text-gray-300 border border-zinc-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          </header>

          <div className="p-4 md:p-6 max-w-7xl mx-auto">{children}</div>
        </section>
      </div>
    </main>
  );
}