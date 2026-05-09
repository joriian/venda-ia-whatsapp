"use client";

export default function AdminTopbar({
  admin,
}: {
  admin: any;
}) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 mb-10">
      <div>
        <h2 className="text-4xl font-black">
          Bem-vindo,
          <span className="text-green-400">
            {" "}
            {admin?.nome || "Admin"}
          </span>
        </h2>

        <p className="text-gray-500 mt-2">
          Gerencie toda sua operação em tempo real.
        </p>
      </div>

      <div className="bg-[#101010] border border-white/10 rounded-2xl px-5 py-4">
        <p className="text-sm text-gray-400">
          Sistema online
        </p>

        <div className="flex items-center gap-2 mt-2">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />

          <p className="font-semibold text-green-400">
            Operacional
          </p>
        </div>
      </div>
    </div>
  );
}