const path = require("path");

require("dotenv").config({
  path: path.resolve(
    __dirname,
    "../.env.local"
  ),
});

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

console.log(
  "SUPABASE_URL:",
  !!process.env.SUPABASE_URL
);

console.log(
  "SUPABASE_SERVICE_ROLE_KEY:",
  !!process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function hashSenha(senha) {
  return crypto
    .createHash("sha256")
    .update(String(senha))
    .digest("hex");
}

async function migrar() {
  console.log(
    "\n🚀 INICIANDO MIGRAÇÃO DE SENHAS...\n"
  );

  const { data: clientes, error } =
    await supabase
      .from("clientes_ia_whatsapp")
      .select(
        "id,nome,email,senha,senha_hash"
      );

  if (error) {
    console.log(
      "❌ ERRO AO BUSCAR CLIENTES:",
      error.message
    );

    return;
  }

  if (!clientes?.length) {
    console.log(
      "⚠️ NENHUM CLIENTE ENCONTRADO."
    );

    return;
  }

  let atualizados = 0;

  for (const cliente of clientes) {
    try {
      const senhaAtual = String(
        cliente.senha || ""
      ).trim();

      const hashAtual = String(
        cliente.senha_hash || ""
      ).trim();

      if (!senhaAtual) {
        console.log(
          `⚠️ CLIENTE SEM SENHA: ${cliente.email}`
        );

        continue;
      }

      if (hashAtual) {
        console.log(
          `⏭️ JÁ POSSUI HASH: ${cliente.email}`
        );

        continue;
      }

      const novoHash =
        hashSenha(senhaAtual);

      const { error: updateError } =
        await supabase
          .from(
            "clientes_ia_whatsapp"
          )
          .update({
            senha_hash: novoHash,
          })
          .eq("id", cliente.id);

      if (updateError) {
        console.log(
          `❌ ERRO AO ATUALIZAR ${cliente.email}:`,
          updateError.message
        );

        continue;
      }

      atualizados++;

      console.log(
        `✅ HASH GERADO: ${cliente.email}`
      );
    } catch (error) {
      console.log(
        `❌ ERRO NO CLIENTE ${cliente.email}:`,
        error.message
      );
    }
  }

  console.log(
    `\n🎉 MIGRAÇÃO FINALIZADA. ${atualizados} SENHAS MIGRADAS.\n`
  );
}

migrar();