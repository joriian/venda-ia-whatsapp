"use client";

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

export default function Home() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoSelecionado, setServicoSelecionado] = useState("");
  const [planoSelecionado, setPlanoSelecionado] = useState("");
  const [loadingPlano, setLoadingPlano] = useState<string | null>(null);

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
  const [loadingCupom, setLoadingCupom] = useState(false);

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

  const servicoAtual = useMemo(() => {
    return servicos.find((servico) => servico.id === servicoSelecionado);
  }, [servicos, servicoSelecionado]);

  const planosDoServico = servicoAtual?.planos || [];

  useEffect(() => {
    setCupomAplicado(null);
  }, [servicoSelecionado, planoSelecionado]);

  function dinheiro(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function senhaForte(senhaValor: string) {
    const temMaiuscula = /[A-Z]/.test(senhaValor);
    const temMinuscula = /[a-z]/.test(senhaValor);
    const temNumero = /[0-9]/.test(senhaValor);
    const temEspecial = /[^A-Za-z0-9]/.test(senhaValor);
    const tamanhoOk = senhaValor.length >= 8;

    return tamanhoOk && temMaiuscula && temMinuscula && temNumero && temEspecial;
  }

  async function aplicarCupom() {
    if (!cupomCodigo.trim()) {
      alert("Digite um cupom.");
      return;
    }

    if (!servicoSelecionado || !planoSelecionado) {
      alert("Selecione um serviço e um plano antes.");
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
        alert(data.error || "Cupom inválido.");
        return;
      }

      setCupomAplicado(data);
      alert("Cupom aplicado com sucesso.");
    } catch {
      alert("Erro ao aplicar cupom.");
    } finally {
      setLoadingCupom(false);
    }
  }

  async function comprar(planoId: string) {
    if (!servicoSelecionado || !planoId) {
      alert("Selecione um serviço e um plano.");
      return;
    }

    if (!nome || !email || !telefone) {
      alert("Nome, email e WhatsApp são obrigatórios.");
      return;
    }

    if (!senha || !confirmarSenha) {
      alert("Cadastre e confirme sua senha.");
      return;
    }

    if (senha !== confirmarSenha) {
      alert("A senha e a confirmação não são iguais.");
      return;
    }

    if (!senhaForte(senha)) {
      alert(
        "A senha deve ter no mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial."
      );
      return;
    }

    if (!aceitouTermos) {
      alert("Você precisa aceitar os termos de uso.");
      return;
    }

    setLoadingPlano(planoId);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          servicoId: servicoSelecionado,
          planoId,
          nome,
          email,
          telefone,
          endereco,
          documento,
          senha,
          confirmarSenha,
          aceitouTermos,
          cupomCodigo: cupomAplicado?.cupom?.codigo || cupomCodigo,
        }),
      });

      const data = await res.json();

      if (!data.init_point) {
        alert(data.error || "Erro ao gerar pagamento");
        return;
      }

      window.location.href = data.init_point;
    } catch (error) {
      alert("Erro ao iniciar pagamento");
      console.error(error);
    } finally {
      setLoadingPlano(null);
    }
  }

  function precoFinal(plano: Plano) {
    if (cupomAplicado && cupomAplicado.valorFinal !== undefined) {
      return Number(cupomAplicado.valorFinal || 0);
    }

    return Number(plano.valor || 0);
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <section className="text-center mb-10">
          <p className="text-green-400 font-semibold mb-3">
            Plataforma de automações com IA
          </p>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Escolha um serviço e comece agora
          </h1>

          <p className="text-gray-300 max-w-2xl mx-auto">
            Cadastre seus dados, escolha o plano ideal e libere sua área do cliente
            após o pagamento.
          </p>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-1 bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-2">1. Seus dados</h2>

            <p className="text-gray-400 text-sm mb-5">
              Campos com * são obrigatórios.
            </p>

            <div className="grid gap-3">
              <input
                placeholder="Nome completo *"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full p-3 rounded bg-zinc-800 border border-zinc-700"
              />

              <input
                placeholder="Email *"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded bg-zinc-800 border border-zinc-700"
              />

              <input
                placeholder="WhatsApp com DDD *"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full p-3 rounded bg-zinc-800 border border-zinc-700"
              />

              <input
                placeholder="Endereço completo (opcional)"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="w-full p-3 rounded bg-zinc-800 border border-zinc-700"
              />

              <input
                placeholder="CPF/CNPJ ou documento (opcional)"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                className="w-full p-3 rounded bg-zinc-800 border border-zinc-700"
              />

              <input
                type="password"
                placeholder="Crie uma senha forte *"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full p-3 rounded bg-zinc-800 border border-zinc-700"
              />

              <input
                type="password"
                placeholder="Confirme sua senha *"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full p-3 rounded bg-zinc-800 border border-zinc-700"
              />

              <p className="text-xs text-gray-400">
                A senha precisa ter no mínimo 8 caracteres, uma letra maiúscula,
                uma minúscula, um número e um caractere especial.
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-2">2. Escolha o serviço</h2>

            <p className="text-gray-400 text-sm mb-5">
              Cada serviço pode ter planos diferentes.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              {servicos.map((servico) => (
                <button
                  key={servico.id}
                  onClick={() => {
                    setServicoSelecionado(servico.id);

                    if (servico.planos?.length > 0) {
                      setPlanoSelecionado(servico.planos[0].id);
                    } else {
                      setPlanoSelecionado("");
                    }
                  }}
                  className={`text-left border rounded-xl p-4 ${
                    servicoSelecionado === servico.id
                      ? "border-green-500 bg-green-900/20"
                      : "border-zinc-700 bg-zinc-800"
                  }`}
                >
                  <h3 className="font-bold">{servico.nome}</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {servico.descricao || "Serviço disponível para contratação."}
                  </p>
                </button>
              ))}
            </div>

            <h2 className="text-xl font-bold mb-4">3. Escolha o plano</h2>

            {planosDoServico.length === 0 && (
              <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 text-center text-gray-400">
                Nenhum plano disponível para este serviço.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              {planosDoServico.map((plano) => {
                const selecionado = planoSelecionado === plano.id;
                const destacado = Boolean(plano.destaque);

                return (
                  <div
                    key={plano.id}
                    onClick={() => setPlanoSelecionado(plano.id)}
                    className={`relative bg-zinc-800 border rounded-2xl p-6 cursor-pointer ${
                      selecionado
                        ? "border-blue-500"
                        : destacado
                        ? "border-green-500"
                        : "border-zinc-700"
                    }`}
                  >
                    {destacado && (
                      <span className="absolute -top-3 left-4 bg-green-600 px-3 py-1 rounded-full text-xs font-bold">
                        Mais escolhido
                      </span>
                    )}

                    {selecionado && (
                      <span className="absolute -top-3 right-4 bg-blue-600 px-3 py-1 rounded-full text-xs font-bold">
                        Selecionado
                      </span>
                    )}

                    <h3 className="text-2xl font-bold">{plano.nome}</h3>

                    {plano.descricao && (
                      <p className="text-gray-400 text-sm mt-2">
                        {plano.descricao}
                      </p>
                    )}

                    {cupomAplicado && selecionado ? (
                      <div className="mt-5">
                        <p className="text-gray-400 line-through">
                          {dinheiro(plano.valor)}
                        </p>

                        <p className="text-3xl font-bold text-green-400">
                          {dinheiro(precoFinal(plano))}
                        </p>

                        <p className="text-xs text-green-400 mt-1">
                          Desconto: {dinheiro(cupomAplicado.descontoValor)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-3xl font-bold mt-5">
                        {dinheiro(plano.valor)}
                      </p>
                    )}

                    <p className="text-gray-400 mt-2">
                      Acesso por {plano.meses}{" "}
                      {plano.meses === 1 ? "mês" : "meses"}
                    </p>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        comprar(plano.id);
                      }}
                      disabled={loadingPlano !== null}
                      className="mt-6 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-5 py-3 rounded-lg font-semibold"
                    >
                      {loadingPlano === plano.id
                        ? "Gerando..."
                        : "Pagar e criar acesso"}
                    </button>

                    <p className="text-xs text-gray-400 mt-3">
                      Após pagar, clique em <strong>“Voltar ao site”</strong>.
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
              <h3 className="font-bold mb-3">Cupom de desconto</h3>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                <input
                  value={cupomCodigo}
                  onChange={(e) => setCupomCodigo(e.target.value.toUpperCase())}
                  placeholder="Digite seu cupom"
                  className="p-3 rounded bg-zinc-900 border border-zinc-700"
                />

                <button
                  onClick={aplicarCupom}
                  disabled={loadingCupom}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-5 py-3 rounded font-bold"
                >
                  {loadingCupom ? "Validando..." : "Aplicar cupom"}
                </button>
              </div>

              {cupomAplicado && (
                <p className="text-green-400 text-sm mt-3">
                  Cupom {cupomAplicado.cupom.codigo} aplicado. Desconto de{" "}
                  {dinheiro(cupomAplicado.descontoValor)}.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-2">{termosTitulo}</h2>

          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-sm text-gray-300 max-h-44 overflow-y-auto whitespace-pre-line">
            {termosConteudo}
          </div>

          <label className="flex gap-3 items-start mt-4 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={aceitouTermos}
              onChange={(e) => setAceitouTermos(e.target.checked)}
              className="mt-1"
            />
            <span>Li e aceito os termos de uso da plataforma.</span>
          </label>
        </section>
      </div>
    </main>
  );
}