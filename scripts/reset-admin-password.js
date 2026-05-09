const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env.local"),
});

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function hashSenha(senha) {
  return crypto.createHash("sha256").update(String(senha).trim()).digest("hex");
}

async function resetarSenhaAdmin() {
  const email = "joriian@hotmail.com";
  const novaSenha = "12345";

  const senha_hash = hashSenha(novaSenha);

  const { data, error } = await supabase
    .from("admin_users")
    .update({
      senha_hash,
      ativo: true,
      session_token: null,
      session_expires_at: null,
    })
    .ilike("email", email)
    .select();

  if (error) {
    console.log("Erro:", error.message);
    return;
  }

  console.log("Admin atualizado:", data);
  console.log("Email:", email);
  console.log("Nova senha:", novaSenha);
}

resetarSenhaAdmin();