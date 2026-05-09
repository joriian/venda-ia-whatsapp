"use client";

export default function AdminResumoCards({
  totalClientes,
  totalInstancias,
  receita,
}: {
  totalClientes: number;
  totalInstancias: number;
  receita: number | string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
      <CardResumo
        titulo="Clientes"
        valor={totalClientes}
      />

      <CardResumo
        titulo="Instâncias"
        valor={totalInstancias}
      />

      <CardResumo
        titulo="Receita"
        valor={`R$ ${receita || 0}`}
      />
    </div>
  );
}

function CardResumo({
  titulo,
  valor,
}: {
  titulo: string;
  valor: any;
}) {
  return (
    <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6">
      <p className="text-gray-500 text-sm">
        {titulo}
      </p>

      <h2 className="text-4xl font-black mt-4">
        {valor}
      </h2>
    </div>
  );
}