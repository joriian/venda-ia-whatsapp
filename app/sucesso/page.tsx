"use client";

import { useEffect, useState } from "react";

export default function Sucesso() {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cliente = params.get("cliente");

    if (!cliente) return;

    const instance = `cliente_${cliente.replace(/-/g, "")}`;

    async function buscarQR() {
      const res = await fetch(`/api/instance/qrcode?instance=${instance}`);
      const data = await res.json();

      if (data?.base64) {
        setQr(data.base64);
      } else {
        setTimeout(buscarQR, 3000);
      }
    }

    buscarQR();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <h1 className="text-3xl mb-4">Pagamento aprovado 🎉</h1>

      <p className="mb-6">Escaneie o QR Code para conectar seu WhatsApp</p>

      {qr ? (
        <img src={qr} alt="QR Code" />
      ) : (
        <p>Gerando QR Code...</p>
      )}
    </div>
  );
}