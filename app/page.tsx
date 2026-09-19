"use client";

import { useState } from "react";
import { ATLETICAS, DESAFIO, EVENTO, acharAtletica, reaisParaKg } from "@/lib/config";
import { TelaPagamento } from "@/components/TelaPagamento";
import { TelaEspera } from "@/components/TelaEspera";
import { TelaSucesso } from "@/components/TelaSucesso";
import { TermoDados } from "@/components/TermoDados";
import { Premios } from "@/components/Premios";

type Etapa = "dados" | "pagamento" | "espera" | "sucesso";

export default function Pagina() {
  const [etapa, setEtapa] = useState<Etapa>("dados");
  const [nome, setNome] = useState("");
  const [atleticaId, setAtleticaId] = useState("");
  const [aceite, setAceite] = useState(false);
  const [mostrarTermo, setMostrarTermo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [doacaoId, setDoacaoId] = useState<string | null>(null);
  const [pesoKg, setPesoKg] = useState(0);
  const [valor, setValor] = useState(0);

  const atletica = acharAtletica(atleticaId);
  const dadosCompletos = nome.trim().length >= 2 && Boolean(atletica) && aceite;

  /** Grava a doação. Devolve o registro criado para a tela usar os valores. */
  async function criarDoacao(quantidade: number) {
    const resposta = await fetch("/api/doacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nome.trim(),
        atleticaId,
        tipo: "pix",
        quantidade,
        aceiteTermo: aceite,
      }),
    });

    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      throw new Error(corpo.erro ?? "Não consegui registrar a doação.");
    }
    return corpo.doacao as { id: string; pesoKg: number; valor: number };
  }

  /**
   * Copiar o código PIX já leva para a espera — o pagamento começou ali.
   * Nada é gravado ainda: quem confirma é o "Já paguei", e quem volta
   * atrás não deixa doação órfã no banco.
   */
  function irParaEspera(valorEscolhido: number) {
    setValor(valorEscolhido);
    setPesoKg(reaisParaKg(valorEscolhido));
    setEtapa("espera");
  }

  /** "Já paguei": grava e confirma de uma vez. */
  async function confirmarPix() {
    const doacao = await criarDoacao(valor);
    setDoacaoId(doacao.id);
    setPesoKg(doacao.pesoKg);
    setEtapa("sucesso");
    // A confirmação é otimista: a tela de sucesso não espera a rede.
    await fetch(`/api/doacoes/${doacao.id}/confirmar`, { method: "POST" }).catch(() => {});
  }

  function recomecar() {
    setEtapa("dados");
    setNome("");
    setAtleticaId("");
    setAceite(false);
    setDoacaoId(null);
    setPesoKg(0);
    setValor(0);
    setErro(null);
  }

  if (etapa === "pagamento" && atletica) {
    return (
      <TelaPagamento
        nome={nome.trim()}
        atletica={atletica}
        aoVoltar={() => setEtapa("dados")}
        aoIrParaEspera={irParaEspera}
      />
    );
  }

  if (etapa === "espera") {
    return (
      <TelaEspera
        valor={valor}
        pesoKg={pesoKg}
        aoConfirmar={confirmarPix}
        aoVoltar={() => setEtapa("pagamento")}
      />
    );
  }

  if (etapa === "sucesso" && doacaoId && atletica) {
    return (
      <TelaSucesso
        doacaoId={doacaoId}
        nome={nome.trim()}
        atletica={atletica}
        pesoKg={pesoKg}
        aoRecomecar={recomecar}
      />
    );
  }

  return (
    <main className="tela">
      <div className="marca">
        <div className="marca-selos">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/logo/casa-caramelo-roxo.png" alt="Casa Caramelo" />
          <span aria-hidden="true">×</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="marca-laf" src="/marca/laf-branco.png" alt="LAF Goiás" />
        </div>
        <h1>{EVENTO.nome}</h1>
        <p>
          {EVENTO.chamada} Cada atlética tem uma meta de{" "}
          <strong>{DESAFIO.metaKg} kg</strong>.
        </p>
      </div>

      <Premios />

      <form
        className="cartao"
        onSubmit={(evento) => {
          evento.preventDefault();
          if (!dadosCompletos) {
            setErro("Preencha seu nome, escolha a atlética e aceite o termo.");
            return;
          }
          setErro(null);
          setEtapa("pagamento");
        }}
      >
        <div className="campo">
          <label htmlFor="nome">Seu nome</label>
          <input
            id="nome"
            type="text"
            autoComplete="name"
            placeholder="Como te chamam?"
            value={nome}
            maxLength={60}
            onChange={(evento) => setNome(evento.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="atletica">Sua atlética</label>
          <select
            id="atletica"
            value={atleticaId}
            onChange={(evento) => setAtleticaId(evento.target.value)}
          >
            <option value="">Escolha a atlética</option>
            <optgroup label="Chave A">
              {ATLETICAS.filter((item) => item.chave === "A").map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </optgroup>
            <optgroup label="Chave B">
              {ATLETICAS.filter((item) => item.chave === "B").map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </optgroup>
          </select>
          {atletica ? (
            <span className="resumo" style={{ marginTop: 4 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={atletica.logo} alt="" />
              <span style={{ flex: 1 }}>
                Os quilos vão para a <strong>{atletica.nome}</strong>.
              </span>
            </span>
          ) : (
            <span className="dica">Os quilos que você doar contam para ela na disputa.</span>
          )}
        </div>

        <label className="termo">
          <input
            type="checkbox"
            checked={aceite}
            onChange={(evento) => setAceite(evento.target.checked)}
          />
          <span>
            Aceito o{" "}
            <button type="button" onClick={() => setMostrarTermo(true)}>
              termo de uso de dados
            </button>{" "}
            (nome, atlética e doação).
          </span>
        </label>

        {erro && <span className="erro" style={{ color: "var(--ameixa)", fontWeight: 800 }}>{erro}</span>}

        <button type="submit" className="botao" disabled={!dadosCompletos}>
          Eu quero doar
        </button>
      </form>

      <p className="rodape">
        <a href="/ranking">Ver o placar do desafio →</a>
      </p>

      {mostrarTermo && <TermoDados aoFechar={() => setMostrarTermo(false)} />}
    </main>
  );
}
