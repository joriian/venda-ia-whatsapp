import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function registrarAuditoriaAdmin({
  admin,
  acao,
  entidade,
  entidadeId,
  descricao,
  payload,
  req,
}: any) {
  try {
    const forwarded = req?.headers?.get?.("x-forwarded-for");

    const ip =
      forwarded?.split(",")?.[0]?.trim() ||
      "desconhecido";

    await supabase.from("admin_auditoria").insert({
      admin_id: admin?.id || null,
      admin_nome: admin?.nome || null,
      admin_email: admin?.email || null,

      acao,

      entidade: entidade || null,
      entidade_id: entidadeId || null,

      descricao: descricao || null,

      payload: payload || {},

      ip,
    });
  } catch (error) {
    console.log(
      "ERRO AUDITORIA ADMIN:",
      error
    );
  }
}