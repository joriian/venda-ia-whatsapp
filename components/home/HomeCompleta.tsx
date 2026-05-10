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

  function mensagemErro(data: any, fallback: string) {
    if (typeof data?.detalhe === "string") return data.detalhe;
    if (typeof data?.error === "string") return data.error;

    if (data?.detalhe) {
      try {
        return JSON.stringify(data.detalhe);
      } catch {
        return fallback;
      }
    }

    if (data?.error) {
      try {
        return JSON.stringify(data.error);
      } catch {
        return fallback;
      }
    }

    return fallback;
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: cupomCodigo,
          servicoId: servicoSelecionado,
          planoId: planoSelecionado,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setCupomAplicado(null);
        alert(mensagemErro(data, "Cupom inválido."));
        return;
      }

      setCupomAplicado(data);
      alert("Cupom aplicado com sucesso.");
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Erro ao aplicar cupom.");
    } finally {
      setLoadingCupom(false);
    }
  }

  async function enviarCodigo() {
    if (!validarFormulario()) return;

    setLoadingCodigo(true);

    try {
      const res = await fetch("/api/cadastro/enviar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          telefone,
          endereco,
          documento,
          senha,
          confirmarSenha,
          aceitouTermos,
          servicoId: servicoSelecionado,
          planoId: planoSelecionado,
          cupomCodigo: cupomAplicado?.cupom?.codigo || cupomCodigo || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        console.log(data);
        alert(mensagemErro(data, "Erro ao enviar código."));
        return;
      }

      setCadastroId(data.cadastro_id);
      alert("Código enviado pelo WhatsApp.");
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Erro ao enviar código.");
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
      const res = await fetch("/api/cadastro/verificar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cadastroId, codigo }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(mensagemErro(data, "Erro ao verificar código."));
        return;
      }

      setTelefoneVerificado(true);
      setClienteToken(data.token || "");
      localStorage.setItem("clienteToken", data.token || "");
      alert("WhatsApp verificado. Agora você pode finalizar o pagamento.");
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Erro ao verificar código.");
    } finally {
      setLoadingVerificar(false);
    }
  }

  async function finalizarPagamento() {
    if (!telefoneVerificado || !clienteToken) {
      alert("Verifique seu WhatsApp antes de pagar.");
      return;
    }

    setLoadingCheckout(true);

    try {
      const res = await fetch("/api/cliente/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: clienteToken,
          servico_id: servicoSelecionado,
          plano_id: planoSelecionado,
          cupom_codigo: cupomAplicado?.cupom?.codigo || cupomCodigo || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error || !data.init_point) {
        alert(mensagemErro(data, "Erro ao gerar pagamento."));
        return;
      }

      window.location.href = data.init_point;
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Erro ao iniciar pagamento.");
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
              <h1 className="text-3xl font-black tracking-wide">NEXORA</h1>
              <p className="text-gray-400 text-sm">Automações com IA para WhatsApp</p>
            </div>
          </div>

          <a
            href="/login"
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-5 py-3 rounded-2xl font-bold text-center"
          >
            Já sou cliente
          </a>
        </header>

        <section className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-zinc-800 rounded-[2rem] p-6 md:p-10 mb-8">
          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
            <div>
              <p className="text-green-400 font-bold mb-3 uppercase tracking-wider">
                Plataforma segura de automações
              </p>

              <h2 className="text-4xl md:text-6xl font-black leading-tight">
                Contrate sua IA pelo WhatsApp com segurança.
              </h2>

              <p className="text-gray-300 mt-5 max-w-2xl">
                Escolha um serviço, valide seu número por código no WhatsApp e finalize o pagamento.
                Seu acesso será liberado automaticamente após aprovação.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-7">
                <Etapa numero="1" titulo="Cadastro" texto="Informe seus dados com senha segura." />
                <Etapa numero="2" titulo="Verificação" texto="Confirme seu WhatsApp por código." />
                <Etapa numero="3" titulo="Pagamento" texto="Pague e libere seu painel." />
              </div>
            </div>

            <div className="bg-black/40 border border-zinc-800 rounded-3xl p-5">
              <h3 className="text-xl font-bold mb-4">Resumo da contratação</h3>

              <Resumo label="Serviço" value={servicoAtual?.nome || "-"} />
              <Resumo label="Plano" value={planoAtual?.nome || "-"} />
              <Resumo label="Duração" value={planoAtual ? `${planoAtual.meses} mês(es)` : "-"} />
              <Resumo
                label="Valor"
                value={planoAtual ? dinheiro(precoFinal(planoAtual)) : "-"}
                destaque
              />

              <div className="mt-5 border-t border-zinc-800 pt-4">
                <StatusLinha ativo={Boolean(cadastroId)} texto="Código enviado" />
                <StatusLinha ativo={telefoneVerificado} texto="WhatsApp verificado" />
                <StatusLinha ativo={aceitouTermos} texto="Termos aceitos" />
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6">
            <h2 className="text-2xl font-bold mb-2">1. Seus dados</h2>
            <p className="text-gray-400 text-sm mb-5">
              Esses dados serão usados para criar sua área do cliente.
            </p>

            <div className="grid gap-3">
              <Input placeholder="Nome completo *" value={nome} setValue={setNome} />
              <Input placeholder="Email *" value={email} setValue={setEmail} type="email" />
              <Input placeholder="WhatsApp com DDD *" value={telefone} setValue={setTelefone} />
              <Input placeholder="Endereço completo (opcional)" value={endereco} setValue={setEndereco} />
              <Input placeholder="CPF/CNPJ ou documento (opcional)" value={documento} setValue={setDocumento} />
              <Input placeholder="Crie uma senha forte *" value={senha} setValue={setSenha} type="password" />
              <Input placeholder="Confirme sua senha *" value={confirmarSenha} setValue={setConfirmarSenha} type="password" />

              <p className="text-xs text-gray-400">
                A senha precisa ter no mínimo 8 caracteres, letra maiúscula, minúscula, número e caractere especial.
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6">
            <h2 className="text-2xl font-bold mb-2">2. Serviço e plano</h2>
            <p className="text-gray-400 text-sm mb-5">
              Cada serviço tem sua própria automação, workflow e instância.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              {servicos.map((servico) => (
                <button
                  key={servico.id}
                  onClick={() => {
                    setServicoSelecionado(servico.id);
                    setPlanoSelecionado(servico.planos?.[0]?.id || "");
                  }}
                  className={`text-left border rounded-2xl p-4 ${
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {planosDoServico.map((plano) => {
                const selecionado = planoSelecionado === plano.id;

                return (
                  <button
                    key={plano.id}
                    onClick={() => setPlanoSelecionado(plano.id)}
                    className={`relative text-left bg-zinc-800 border rounded-3xl p-5 ${
                      selecionado ? "border-blue-500" : plano.destaque ? "border-green-500" : "border-zinc-700"
                    }`}
                  >
                    {plano.destaque && (
                      <span className="absolute -top-3 left-4 bg-green-600 px-3 py-1 rounded-full text-xs font-bold">
                        Mais escolhido
                      </span>
                    )}

                    {selecionado && (
                      <span className="absolute -top-3 right-4 bg-blue-600 px-3 py-1 rounded-full text-xs font-bold">
                        Selecionado
                      </span>
                    )}

                    <h3 className="text-xl font-black">{plano.nome}</h3>
                    <p className="text-gray-400 text-sm mt-2 min-h-10">
                      {plano.descricao || "Plano mensal para uso da automação."}
                    </p>

                    {cupomAplicado && selecionado ? (
                      <div className="mt-5">
                        <p className="text-gray-500 line-through">{dinheiro(plano.valor)}</p>
                        <p className="text-3xl font-black text-green-400">{dinheiro(precoFinal(plano))}</p>
                      </div>
                    ) : (
                      <p className="text-3xl font-black mt-5">{dinheiro(plano.valor)}</p>
                    )}

                    <p className="text-gray-400 text-sm mt-2">
                      Acesso por {plano.meses} {plano.meses === 1 ? "mês" : "meses"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6">
            <h2 className="text-2xl font-bold mb-2">3. Cupom e termos</h2>

            <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 mb-5">
              <h3 className="font-bold mb-3">Cupom de desconto</h3>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                <input
                  value={cupomCodigo}
                  onChange={(e) => setCupomCodigo(e.target.value.toUpperCase())}
                  placeholder="Digite seu cupom"
                  className="p-3 rounded-xl bg-zinc-900 border border-zinc-700"
                />

                <button
                  onClick={aplicarCupom}
                  disabled={loadingCupom}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-5 py-3 rounded-xl font-bold"
                >
                  {loadingCupom ? "Validando..." : "Aplicar"}
                </button>
              </div>

              {cupomAplicado && (
                <p className="text-green-400 text-sm mt-3">
                  Cupom aplicado. Desconto de {dinheiro(cupomAplicado.descontoValor)}.
                </p>
              )}
            </div>

            <h3 className="font-bold mb-2">{termosTitulo}</h3>
            <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-sm text-gray-300 max-h-44 overflow-y-auto whitespace-pre-line">
              {termosConteudo || "Termos indisponíveis no momento."}
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
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6">
            <h2 className="text-2xl font-bold mb-2">4. Verificação e pagamento</h2>
            <p className="text-gray-400 text-sm mb-5">
              Por segurança, o pagamento só é liberado depois da confirmação do WhatsApp.
            </p>

            {!telefoneVerificado && (
              <div className="grid gap-3">
                <button
                  onClick={enviarCodigo}
                  disabled={loadingCodigo}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 py-3 rounded-2xl font-bold"
                >
                  {loadingCodigo ? "Enviando código..." : cadastroId ? "Reenviar código" : "Enviar código pelo WhatsApp"}
                </button>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                  <input
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Digite o código recebido"
                    className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700"
                  />

                  <button
                    onClick={verificarCodigo}
                    disabled={loadingVerificar || !cadastroId}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 px-5 py-3 rounded-2xl font-bold"
                  >
                    {loadingVerificar ? "Verificando..." : "Confirmar código"}
                  </button>
                </div>
              </div>
            )}

            {telefoneVerificado && (
              <div className="bg-green-900/30 border border-green-700 rounded-2xl p-4 mb-4">
                <p className="font-bold text-green-400">WhatsApp verificado com sucesso.</p>
                <p className="text-gray-300 text-sm mt-1">
                  Agora você pode finalizar o pagamento com segurança.
                </p>
              </div>
            )}

            <button
              onClick={finalizarPagamento}
              disabled={!telefoneVerificado || loadingCheckout}
              className="mt-5 w-full bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-600 py-4 rounded-2xl font-black text-lg"
            >
              {loadingCheckout ? "Gerando pagamento..." : "Finalizar pagamento"}
            </button>

            <p className="text-xs text-gray-500 mt-3">
              Após a aprovação, sua área do cliente será liberada automaticamente.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Input({ value, setValue, placeholder, type = "text" }: any) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700"
    />
  );
}

function Etapa({ numero, titulo, texto }: any) {
  return (
    <div className="bg-black/40 border border-zinc-800 rounded-2xl p-4">
      <p className="text-green-400 font-black text-xl">{numero}</p>
      <h3 className="font-bold mt-1">{titulo}</h3>
      <p className="text-gray-400 text-sm mt-1">{texto}</p>
    </div>
  );
}

function Resumo({ label, value, destaque }: any) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800 py-3">
      <span className="text-gray-400">{label}</span>
      <span className={`font-bold text-right ${destaque ? "text-green-400 text-xl" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function StatusLinha({ ativo, texto }: any) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-gray-400">{texto}</span>
      <span className={ativo ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
        {ativo ? "OK" : "Pendente"}
      </span>
    </div>
  );
}