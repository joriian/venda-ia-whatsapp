"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Plano = {
  id: string;
  nome: string;
  descricao?: string;
  meses: number;
  valor: number;
  destaque?: boolean;
};

type Servico = {
  id: string;
  nome: string;
  slug: string;
  descricao?: string;
  planos: Plano[];
};

export default function HomeCompleta() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoSelecionado, setServicoSelecionado] = useState("");
  const [planoSelecionado, setPlanoSelecionado] = useState("");

  const [termosTitulo, setTermosTitulo] = useState("Termos de uso");
  const [termosConteudo, setTermosConteudo] = useState("");

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [documento, setDocumento] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);

  const [cupomCodigo, setCupomCodigo] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<any>(null);

  const [cadastroId, setCadastroId] = useState("");
  const [codigo, setCodigo] = useState("");
  const [telefoneVerificado, setTelefoneVerificado] = useState(false);
  const [clienteToken, setClienteToken] = useState("");

  const [loadingCupom, setLoadingCupom] = useState(false);
  const [loadingCodigo, setLoadingCodigo] = useState(false);
  const [loadingVerificar, setLoadingVerificar] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const resPlanos = await fetch("/api/planos");
    const dataPlanos = await resPlanos.json();

    if (Array.isArray(dataPlanos)) {
      setServicos(dataPlanos);

      if (dataPlanos.length > 0) {
        setServicoSelecionado(dataPlanos[0].id);

        if (dataPlanos[0].planos?.length > 0) {
          setPlanoSelecionado(dataPlanos[0].planos[0].id);
        }
      }
    }

    const resTermos = await fetch("/api/termos");
    const dataTermos = await resTermos.json();

    if (dataTermos?.termos) {
      setTermosTitulo(dataTermos.termos.titulo || "Termos de uso");
      setTermosConteudo(dataTermos.termos.conteudo || "");
    }
  }

  const servicoAtual = useMemo(
    () => servicos.find((s) => s.id === servicoSelecionado),
    [servicos, servicoSelecionado]
  );

  const planosDoServico = servicoAtual?.planos || [];
  const planoAtual = planosDoServico.find((p) => p.id === planoSelecionado);

  useEffect(() => {
    setCupomAplicado(null);
    setTelefoneVerificado(false);
    setCadastroId("");
    setClienteToken("");
    setCodigo("");
  }, [servicoSelecionado, planoSelecionado]);

  function dinheiro(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function senhaForte(valor: string) {
    return (
      valor.length >= 8 &&
      /[A-Z]/.test(valor) &&
      /[a-z]/.test(valor) &&
      /[0-9]/.test(valor) &&
      /[^A-Za-z0-9]/.test(valor)
    );
  }

  function precoFinal(plano: Plano) {
    if (cupomAplicado?.valorFinal !== undefined) {
      return Number(cupomAplicado.valorFinal || 0);
    }

    return Number(plano.valor || 0);
  }

  function validarFormulario() {
    if (!nome || !email || !telefone) {
      alert("Nome, email e WhatsApp são obrigatórios.");
      return false;
    }

    if (!senha || !confirmarSenha) {
      alert("Cadastre e confirme sua senha.");
      return false;
    }

    if (senha !== confirmarSenha) {
      alert("A senha e a confirmação não são iguais.");
      return false;
    }

    if (!senhaForte(senha)) {
      alert("A senha precisa ter 8 caracteres, maiúscula, minúscula, número e caractere especial.");
      return false;
    }

    if (!servicoSelecionado || !planoSelecionado) {
      alert("Selecione um serviço e um plano.");
      return false;
    }

    if (!aceitouTermos) {
      alert("Você precisa aceitar os termos de uso.");
      return false;
    }

    return true;
  }

  async function aplicarCupom() {
    if (!cupomCodigo.trim()) {
      alert("Digite um cupom.");
      return;
    }

    setLoadingCupom(true);

    try {
      const res = await fetch("/api/cupom/validar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          codigo: cupomCodigo,
          servicoId: servicoSelecionado,
          planoId: planoSelecionado,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setCupomAplicado(null);

        alert(
          typeof data?.error === "string"
            ? data.error
            : JSON.stringify(data)
        );

        return;
      }

      setCupomAplicado(data);

      alert("Cupom aplicado com sucesso.");
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
          "Erro ao aplicar cupom."
      );
    } finally {
      setLoadingCupom(false);
    }
  }

  async function enviarCodigo() {
    if (!validarFormulario()) return;

    setLoadingCodigo(true);

    try {
      const res = await fetch(
        "/api/cadastro/enviar-codigo",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            nome,
            email,
            telefone,
            endereco,
            documento,
            senha,
            confirmarSenha,
            aceitouTermos,

            servicoId:
              servicoSelecionado,

            planoId:
              planoSelecionado,

            cupomCodigo:
              cupomAplicado?.cupom
                ?.codigo ||
              cupomCodigo ||
              null,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        console.log(data);

        const erro =
          typeof data?.detalhe ===
          "string"
            ? data.detalhe
            : typeof data?.error ===
              "string"
            ? data.error
            : JSON.stringify(
                data?.detalhe ||
                  data?.error ||
                  data
              );

        alert(
          erro ||
            "Erro ao enviar código."
        );

        return;
      }

      setCadastroId(
        data.cadastro_id
      );

      alert(
        "Código enviado pelo WhatsApp."
      );
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
          "Erro ao enviar código."
      );
    } finally {
      setLoadingCodigo(false);
    }
  }

  async function verificarCodigo() {
    if (!cadastroId) {
      alert("Envie o código primeiro.");
      return;
    }

    if (!codigo.trim()) {
      alert("Digite o código recebido.");
      return;
    }

    setLoadingVerificar(true);

    try {
      const res = await fetch(
        "/api/cadastro/verificar-codigo",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            cadastroId,
            codigo,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        const erro =
          typeof data?.detalhe ===
          "string"
            ? data.detalhe
            : typeof data?.error ===
              "string"
            ? data.error
            : JSON.stringify(data);

        alert(
          erro ||
            "Erro ao verificar código."
        );

        return;
      }

      setTelefoneVerificado(true);

      setClienteToken(
        data.token || ""
      );

      localStorage.setItem(
        "clienteToken",
        data.token || ""
      );

      alert(
        "WhatsApp verificado com sucesso."
      );
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
          "Erro ao verificar código."
      );
    } finally {
      setLoadingVerificar(false);
    }
  }

  async function finalizarPagamento() {
    if (
      !telefoneVerificado ||
      !clienteToken
    ) {
      alert(
        "Verifique seu WhatsApp antes de pagar."
      );

      return;
    }

    setLoadingCheckout(true);

    try {
      const res = await fetch(
        "/api/cliente/checkout",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            token: clienteToken,

            servico_id:
              servicoSelecionado,

            plano_id:
              planoSelecionado,

            cupom_codigo:
              cupomAplicado?.cupom
                ?.codigo ||
              cupomCodigo ||
              null,
          }),
        }
      );

      const data = await res.json();

      if (
        !res.ok ||
        data.error ||
        !data.init_point
      ) {
        const erro =
          typeof data?.detalhe ===
          "string"
            ? data.detalhe
            : typeof data?.error ===
              "string"
            ? data.error
            : JSON.stringify(data);

        alert(
          erro ||
            "Erro ao gerar pagamento."
        );

        return;
      }

      window.location.href =
        data.init_point;
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
          "Erro ao iniciar pagamento."
      );
    } finally {
      setLoadingCheckout(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-5 py-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden">
              <Image
                src="/nexora-logo.png"
                alt="Nexora"
                width={58}
                height={58}
                className="object-contain"
                priority
              />
            </div>

            <div>
              <h1 className="text-3xl font-black tracking-wide">
                NEXORA
              </h1>

              <p className="text-gray-400 text-sm">
                Automações com IA para
                WhatsApp
              </p>
            </div>
          </div>

          <a
            href="/login"
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-5 py-3 rounded-2xl font-bold text-center"
          >
            Já sou cliente
          </a>
        </header>

        {/* RESTANTE DA UI IGUAL */}
      </div>
    </main>
  );
}

function Input({
  value,
  setValue,
  placeholder,
  type = "text",
}: any) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) =>
        setValue(e.target.value)
      }
      className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700"
    />
  );
}

function Etapa({
  numero,
  titulo,
  texto,
}: any) {
  return (
    <div className="bg-black/40 border border-zinc-800 rounded-2xl p-4">
      <p className="text-green-400 font-black text-xl">
        {numero}
      </p>

      <h3 className="font-bold mt-1">
        {titulo}
      </h3>

      <p className="text-gray-400 text-sm mt-1">
        {texto}
      </p>
    </div>
  );
}

function Resumo({
  label,
  value,
  destaque,
}: any) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800 py-3">
      <span className="text-gray-400">
        {label}
      </span>

      <span
        className={`font-bold text-right ${
          destaque
            ? "text-green-400 text-xl"
            : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function StatusLinha({
  ativo,
  texto,
}: any) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-gray-400">
        {texto}
      </span>

      <span
        className={
          ativo
            ? "text-green-400 font-bold"
            : "text-red-400 font-bold"
        }
      >
        {ativo ? "OK" : "Pendente"}
      </span>
    </div>
  );
}