const path = require("path");

require("dotenv").config({
  path: path.resolve(
    __dirname,
    "../.env.local"
  ),
});

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

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

async function migrarAdmin() {
  console.log(
    "\n🚀 MIGRANDO SENHAS ADMIN...\n"
  );

  const { data: admins, error } =
    await supabase
      .from("admin_users")
      .select("*");

  if (error) {
    console.log(
      "❌ ERRO:",
      error.message
    );

    return;
  }

  if (!admins?.length) {
    console.log(
      "⚠️ NENHUM ADMIN ENCONTRADO"
    );

    return;
  }

  let atualizados = 0;

  for (const admin of admins) {
    try {
      const senhaAtual = String(
        admin.senha || ""
      ).trim();

      const hashAtual = String(
        admin.senha_hash || ""
      ).trim();

      if (!senhaAtual) {
        console.log(
          `⚠️ ADMIN SEM SENHA: ${admin.email}`
        );

        continue;
      }

      if (hashAtual) {
        console.log(
          `⏭️ JÁ POSSUI HASH: ${admin.email}`
        );

        continue;
      }

      const novoHash =
        hashSenha(senhaAtual);

      const {
        error: updateError,
      } = await supabase
        .from("admin_users")
        .update({
          senha_hash: novoHash,
        })
        .eq("id", admin.id);

      if (updateError) {
        console.log(
          `❌ ERRO AO ATUALIZAR ${admin.email}:`,
          updateError.message
        );

        continue;
      }

      atualizados++;

      console.log(
        `✅ HASH GERADO: ${admin.email}`
      );
    } catch (error) {
      console.log(
        `❌ ERRO NO ADMIN ${admin.email}:`,
        error.message
      );
    }
  }

  console.log(
    `\n🎉 MIGRAÇÃO FINALIZADA. ${atualizados} ADMINS MIGRADOS.\n`
  );
}

migrarAdmin();