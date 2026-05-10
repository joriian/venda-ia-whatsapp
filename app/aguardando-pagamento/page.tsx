"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function AguardandoPagamentoContent() {
  const params = useSearchParams();

  const clienteId = params.get("cliente");

  const tokenUrl = params.get("token");

  const paymentId =
    params.get("payment_id") ||
    params.get("collection_id");

  const [tokenFinal, setTokenFinal] = useState("");
  const [status, setStatus] = useState("aguardando_pagamento");
  const [sincronizando, setSincronizando] = useState(true);

  const [qrcode, setQrcode] = useState("");
  const [evolutionStatus, setEvolutionStatus] = useState("connecting");
  const [clienteServicoId, setClienteServicoId] = useState("");

  useEffect(() => {
    const tokenLocal =
      tokenUrl ||
      localStorage.getItem("clienteToken") ||
      "";

    if (tokenLocal) {
      localStorage.setItem("clienteToken", tokenLocal);
      setTokenFinal(tokenLocal);
    }

    if (clienteId) {
      localStorage.setItem("clienteId", clienteId);
    }
  }, [tokenUrl, clienteId]);

  async function sincronizarPagamento() {
    if (!paymentId) {
      setSincronizando(false);
      return;
    }

    try {
      await fetch(
        `/api/mercadopago/sincronizar?payment_id=${paymentId}`,
        {
          cache: "no-store",
        }
      );
    } catch (error) {
      console.log("Erro ao sincronizar pagamento:", error);
    } finally {
      setSincronizando(false);
    }
  }

  async function verificarStatus() {
    if (!clienteId) return;

    try {
      const res = await fetch(
        `/api/cliente/status?cliente=${clienteId}`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (data.status) {
        setStatus(data.status);
      }

      if (
        data.status === "ativo" &&
        data.cliente_servicos?.length
      ) {
        const servicoAtivo =
          data.cliente_servicos.find(
            (s: any) =>
              String(s.status || "").toLowerCase() === "ativo"
          ) || data.cliente_servicos[0];

        setClienteServicoId(servicoAtivo.id);

        if (servicoAtivo.evolution_qrcode) {
          setQrcode(servicoAtivo.evolution_qrcode);
        }

        if (servicoAtivo.evolution_status) {
          setEvolutionStatus(servicoAtivo.evolution_status);
        }

        if (servicoAtivo.evolution_status === "open") {
          irParaCliente();
          return;
        }

        if (tokenFinal) {
          await carregarQrCode(servicoAtivo.id);
        }
      }
    } catch (error) {
      console.log("Erro ao verificar status:", error);
    }
  }

  async function carregarQrCode(idServico: string) {
    if (!tokenFinal) {
      console.log("Token ausente para gerar QR Code.");
      return;
    }

    try {
      const res = await fetch("/api/cliente/evolution", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cliente-token": tokenFinal,
        },
        body: JSON.stringify({
          token: tokenFinal,
          cliente_servico_id: idServico,
          acao: "qrcode",
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        console.log("Erro Evolution:", data);
        return;
      }

      if (data.qrcode) {
        setQrcode(data.qrcode);
      }

      if (data.status) {
        setEvolutionStatus(data.status);
      }
    } catch (error) {
      console.log("Erro ao carregar QR Code:", error);
    }
  }

  async function atualizarEvolution() {
    if (!clienteServicoId || !tokenFinal) return;

    try {
      const res = await fetch("/api/cliente/evolution", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cliente-token": tokenFinal,
        },
        body: JSON.stringify({
          token: tokenFinal,
          cliente_servico_id: clienteServicoId,
          acao: "status",
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        console.log("Erro status Evolution:", data);
        return;
      }

      if (data.status) {
        setEvolutionStatus(data.status);
      }

      if (data.status === "open") {
        irParaCliente();
        return;
      }

      await carregarQrCode(clienteServicoId);
    } catch (error) {
      console.log("Erro ao atualizar evolution:", error);
    }
  }

  function irParaCliente() {
    window.location.href =
      `/cliente?cliente=${clienteId}` +
      (tokenFinal ? `&token=${tokenFinal}` : "");
  }

  useEffect(() => {
    sincronizarPagamento();
  }, [paymentId]);

  useEffect(() => {
    verificarStatus();

    const interval = setInterval(() => {
      verificarStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [clienteId, tokenFinal]);

  useEffect(() => {
    if (!clienteServicoId || !tokenFinal) return;

    const interval = setInterval(() => {
      atualizarEvolution();
    }, 5000);

    return () => clearInterval(interval);
  }, [clienteServicoId, tokenFinal]);

  function statusPt(status: string) {
    const mapa: any = {
      ativo: "Ativo",
      aguardando_pagamento: "Aguardando pagamento",
      pendente: "Pendente",
      aprovado: "Aprovado",
      recusado: "Recusado",
      cancelado: "Cancelado",
      vencido: "Vencido",
      open: "Conectado",
      connected: "Conectado",
      close: "Desconectado",
      disconnected: "Desconectado",
      connecting: "Conectando",
      qrcode: "QR Code disponível",
    };

    return mapa[String(status || "").toLowerCase()] || status || "-";
  }

  if (status === "ativo") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-10 text-center max-w-lg w-full">
          <div className="w-24 h-24 rounded-full bg-green-600 flex items-center justify-center text-5xl font-black mx-auto mb-6">
            ✓
          </div>

          <h1 className="text-5xl font-black mb-4">
            Pagamento aprovado
          </h1>

          <p className="text-gray-300 mb-8">
            Agora conecte seu WhatsApp para ativar a automação.
          </p>

          {qrcode ? (
            <>
              <img
                src={qrcode}
                alt="QR Code"
                className="bg-white p-4 rounded-3xl w-80 h-80 mx-auto"
              />

              <p className="text-yellow-400 font-bold mt-6">
                Escaneie o QR Code com o WhatsApp.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />

              <p className="text-yellow-400 font-bold">
                Aguardando QR Code...
              </p>

              <p className="text-gray-500 mt-2">
                A Evolution está iniciando.
              </p>
            </>
          )}

          <div className="mt-8 bg-zinc-900 border border-zinc-700 rounded-2xl p-4">
            <p className="text-gray-400 text-sm">
              Status da conexão
            </p>

            <p className="font-black text-xl mt-1">
              {statusPt(evolutionStatus)}
            </p>
          </div>

          <button
            onClick={() => {
              if (clienteServicoId) {
                carregarQrCode(clienteServicoId);
              }
            }}
            className="mt-6 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-2xl font-bold"
          >
            Atualizar QR Code
          </button>

          <button
            onClick={irParaCliente}
            className="mt-3 w-full bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded-2xl font-bold"
          >
            Ir para área do cliente
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-10 text-center max-w-lg w-full">
        <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />

        <h1 className="text-4xl font-black mb-4">
          Aguardando pagamento
        </h1>

        <p className="text-gray-300 mb-6">
          Estamos verificando seu pagamento com o Mercado Pago.
        </p>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-5">
          <p className="text-yellow-400 font-bold">
            Status atual
          </p>

          <p className="text-white mt-1">
            {sincronizando
              ? "Sincronizando pagamento..."
              : statusPt(status)}
          </p>
        </div>

        {paymentId && (
          <p className="text-gray-500 text-xs break-all">
            Pagamento: {paymentId}
          </p>
        )}

        <button
          onClick={() => {
            sincronizarPagamento();
            verificarStatus();
          }}
          className="mt-6 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-2xl font-bold"
        >
          Verificar agora
        </button>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p>Carregando...</p>}>
      <AguardandoPagamentoContent />
    </Suspense>
  );
}