import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validarAdmin(req: Request) {
  const token = req.headers.get("x-admin-token");

  if (!token) return null;

  const { data: admin } = await supabase
    .from("admin_users")
    .select("*")
    .eq("session_token", token)
    .eq("ativo", true)
    .maybeSingle();

  if (!admin) return null;

  const expira = admin.session_expires_at
    ? new Date(admin.session_expires_at)
    : null;

  if (!expira || expira < new Date()) return null;

  return admin;
}

function senhaForte(senha: string) {
  const temMaiuscula = /[A-Z]/.test(senha);
  const temMinuscula = /[a-z]/.test(senha);
  const temNumero = /[0-9]/.test(senha);
  const temEspecial = /[^A-Za-z0-9]/.test(senha);
  const tamanhoOk = senha.length >= 8;

  return tamanhoOk && temMaiuscula && temMinuscula && temNumero && temEspecial;
}

export async function GET(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (admin.nivel !== "dono") {
      return NextResponse.json(
        { error: "Sem permissão para gerenciar usuários" },
        { status: 403 }
      );
    }

    const { data: usuarios, error } = await supabase
      .from("admin_users")
      .select("id,nome,email,nivel,ativo,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("ERRO LISTAR ADMINS:", error);
      return NextResponse.json({ error: "Erro ao listar usuários" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      usuarios: usuarios || [],
    });
  } catch (error: any) {
    console.log("ERRO ADMIN USUARIOS GET:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await validarAdmin(req);

    if (!admin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (admin.nivel !== "dono") {
      return NextResponse.json(
        { error: "Sem permissão para gerenciar usuários" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const acao = body.acao;

    if (acao === "criar") {
      const nome = String(body.nome || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const senha = String(body.senha || "").trim();
      const nivel = String(body.nivel || "suporte").trim();

      const niveisPermitidos = ["dono", "admin", "financeiro", "suporte"];

      if (!nome || !email || !senha || !nivel) {
        return NextResponse.json(
          { error: "Preencha nome, email, senha e nível" },
          { status: 400 }
        );
      }

      if (!niveisPermitidos.includes(nivel)) {
        return NextResponse.json({ error: "Nível inválido" }, { status: 400 });
      }

      if (!senhaForte(senha)) {
        return NextResponse.json(
          {
            error:
              "A senha deve ter no mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.",
          },
          { status: 400 }
        );
      }

      const { data: existente } = await supabase
        .from("admin_users")
        .select("id")
        .ilike("email", email)
        .maybeSingle();

      if (existente) {
        return NextResponse.json(
          { error: "Já existe um admin com esse email" },
          { status: 400 }
        );
      }

      const { error } = await supabase.from("admin_users").insert({
        nome,
        email,
        senha,
        nivel,
        ativo: true,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.log("ERRO CRIAR ADMIN:", error);
        return NextResponse.json({ error: "Erro ao criar usuário" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, acao: "criado" });
    }

    if (acao === "atualizar") {
      const id = String(body.id || "").trim();
      const nome = String(body.nome || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const nivel = String(body.nivel || "").trim();
      const ativo = Boolean(body.ativo);

      const niveisPermitidos = ["dono", "admin", "financeiro", "suporte"];

      if (!id || !nome || !email || !nivel) {
        return NextResponse.json(
          { error: "Dados inválidos para atualizar" },
          { status: 400 }
        );
      }

      if (!niveisPermitidos.includes(nivel)) {
        return NextResponse.json({ error: "Nível inválido" }, { status: 400 });
      }

      if (id === admin.id && !ativo) {
        return NextResponse.json(
          { error: "Você não pode desativar seu próprio usuário" },
          { status: 400 }
        );
      }

      if (id === admin.id && nivel !== "dono") {
        return NextResponse.json(
          { error: "Você não pode remover seu próprio nível dono" },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from("admin_users")
        .update({
          nome,
          email,
          nivel,
          ativo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.log("ERRO ATUALIZAR ADMIN:", error);
        return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, acao: "atualizado" });
    }

    if (acao === "alterar_senha") {
      const id = String(body.id || "").trim();
      const novaSenha = String(body.novaSenha || "").trim();

      if (!id || !novaSenha) {
        return NextResponse.json(
          { error: "Informe o usuário e a nova senha" },
          { status: 400 }
        );
      }

      if (!senhaForte(novaSenha)) {
        return NextResponse.json(
          {
            error:
              "A senha deve ter no mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.",
          },
          { status: 400 }
        );
      }

      const novoToken = crypto.randomBytes(32).toString("hex");

      await supabase
        .from("admin_users")
        .update({
          senha: novaSenha,
          session_token: novoToken,
          session_expires_at: new Date(Date.now() - 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      return NextResponse.json({ ok: true, acao: "senha_alterada" });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error: any) {
    console.log("ERRO ADMIN USUARIOS POST:", error.message);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}