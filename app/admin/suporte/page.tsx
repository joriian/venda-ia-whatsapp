"use client";

import { useEffect, useState } from "react";

export default function AdminSuportePage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/suporte");
      const json = await res.json();

      setTickets(json.tickets || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  async function responder(ticketId: string) {
    const mensagem = prompt("Digite a resposta:");

    if (!mensagem) return;

    await fetch("/api/admin/suporte", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticket_id: ticketId,
        mensagem,
      }),
    });

    carregar();
  }

  async function fechar(ticketId: string) {
    await fetch("/api/admin/suporte", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticket_id: ticketId,
      }),
    });

    carregar();
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <main className="p-6 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-black">Suporte</h1>
        <p className="text-zinc-400 mt-2">
          Tickets enviados pelos clientes.
        </p>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : tickets.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center text-zinc-500">
          Nenhum ticket encontrado.
        </div>
      ) : (
        <div className="grid gap-6">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">
                    {ticket.assunto}
                  </h2>

                  <div className="mt-2 text-sm text-zinc-400">
                    Cliente: {ticket.clientes_ia_whatsapp?.nome || "-"}
                  </div>

                  <div className="text-sm text-zinc-400">
                    Email: {ticket.clientes_ia_whatsapp?.email || "-"}
                  </div>

                  <div className="text-sm text-zinc-400">
                    Status: {ticket.status}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => responder(ticket.id)}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl font-bold"
                  >
                    Responder
                  </button>

                  <button
                    onClick={() => fechar(ticket.id)}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl font-bold"
                  >
                    Fechar
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                {ticket.tickets_mensagens?.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`rounded-2xl p-4 border ${
                      msg.autor_tipo === "cliente"
                        ? "bg-zinc-950 border-zinc-800"
                        : "bg-green-950/30 border-green-900"
                    }`}
                  >
                    <div className="font-bold mb-2">
                      {msg.autor_nome}
                    </div>

                    <div className="text-zinc-300 whitespace-pre-wrap">
                      {msg.mensagem}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}