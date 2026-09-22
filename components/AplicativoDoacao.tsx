"use client";

import { useState, type CSSProperties } from "react";
import type { CampoFormulario, EventoPublico } from "@/lib/modelos";
import { TelaPagamento } from "@/components/TelaPagamento";
import { TelaEspera } from "@/components/TelaEspera";
import { TelaSucesso } from "@/components/TelaSucesso";
import { TermoDados } from "@/components/TermoDados";
import { Premios } from "@/components/Premios";
import { digitosTelefone, formatarTelefone, telefoneValido } from "@/lib/telefone";

type Etapa = "dados" | "pagamento" | "espera" | "sucesso";
type Respostas = Record<string, string | boolean>;

function estiloDoEvento(evento: EventoPublico): CSSProperties {
  return {
    "--rosa": evento.corPrimaria,
    "--rosa-escuro": evento.corPrimaria,
    "--roxo": evento.corSecundaria,
    "--roxo-escuro": evento.corSecundaria,
    "--amarelo": evento.corDestaque,
    "--amarelo-escuro": evento.corDestaque,
    "--cartao": evento.corFundoCartao,
  } as CSSProperties;
}

function prazo(evento: EventoPublico): string {
  return new Date(evento.fimEm).toLocaleString("pt-BR", {
    timeZone: evento.fusoHorario,
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CampoExtra({
  campo,
  valor,
  aoMudar,
}: {
  campo: CampoFormulario;
  valor: string | boolean | undefined;
  aoMudar: (valor: string | boolean) => void;
}) {
  if (campo.tipo === "checkbox") {
    return (
      <label className="aceite campo-extra-check">
        <input type="checkbox" checked={valor === true} onChange={(e) => aoMudar(e.target.checked)} />
        <span>{campo.rotulo}{campo.obrigatorio ? " *" : ""}</span>
      </label>
    );
  }
  return (
    <div className="campo">
      <label htmlFor={`campo-${campo.id}`}>{campo.rotulo}{campo.obrigatorio ? " *" : ""}</label>
      {campo.tipo === "texto_longo" ? (
        <textarea id={`campo-${campo.id}`} value={String(valor ?? "")} placeholder={campo.placeholder} onChange={(e) => aoMudar(e.target.value)} rows={3} />
      ) : campo.tipo === "selecao" ? (
        <select id={`campo-${campo.id}`} value={String(valor ?? "")} onChange={(e) => aoMudar(e.target.value)}>
          <option value="">Selecione</option>
          {campo.opcoes.map((opcao) => <option key={opcao} value={opcao}>{opcao}</option>)}
        </select>
      ) : (
        <input id={`campo-${campo.id}`} value={String(valor ?? "")} placeholder={campo.placeholder} onChange={(e) => aoMudar(e.target.value)} />
      )}
    </div>
  );
}

export function AplicativoDoacao({ evento }: { evento: EventoPublico }) {
  const [etapa, setEtapa] = useState<Etapa>("dados");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [participanteId, setParticipanteId] = useState("");
  const [aceite, setAceite] = useState(false);
  const [mostrarTermo, setMostrarTermo] = useState(false);
  const [respostas, setRespostas] = useState<Respostas>({});
  const [erro, setErro] = useState<string | null>(null);
  const [doacaoId, setDoacaoId] = useState<string | null>(null);
  const [tokenConfirmacao, setTokenConfirmacao] = useState<string | null>(null);
  const [pesoKg, setPesoKg] = useState(0);
  const [valor, setValor] = useState(0);

  const participante = evento.participantes.find((item) => item.id === participanteId) ?? null;
  const camposCompletos = evento.campos.every((campo) => {
    if (!campo.obrigatorio) return true;
    const resposta = respostas[campo.chave];
    return campo.tipo === "checkbox" ? resposta === true : String(resposta ?? "").trim().length > 0;
  });
  const telefoneCompleto =
    !evento.pedirTelefone ||
    (telefone ? telefoneValido(telefone) : !evento.telefoneObrigatorio);
  const dadosCompletos =
    nome.trim().length >= 2 &&
    telefoneCompleto &&
    (!evento.temParticipantes || Boolean(participante)) &&
    camposCompletos &&
    aceite;

  const grupos = Array.from(new Set(evento.participantes.map((item) => item.grupo)));

  async function criarDoacao(quantidade: number) {
    const resposta = await fetch("/api/doacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventoId: evento.id,
        nome: nome.trim(),
        telefone,
        participanteId: participante?.id ?? null,
        tipo: "pix",
        quantidade,
        respostas,
        aceiteTermo: aceite,
      }),
    });
    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(corpo.erro ?? "Não consegui registrar a doação.");
    return corpo as {
      doacao: { id: string; pesoKg: number; valor: number };
      tokenConfirmacao: string;
    };
  }

  function irParaEspera(valorEscolhido: number) {
    setValor(valorEscolhido);
    setPesoKg(Math.round((valorEscolhido / evento.reaisPorKg) * 100) / 100);
    setEtapa("espera");
  }

  async function confirmarPix() {
    try {
      const { doacao, tokenConfirmacao: token } = await criarDoacao(valor);
      const resposta = await fetch(`/api/doacoes/${doacao.id}/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!resposta.ok) throw new Error("Não consegui confirmar a doação.");
      setDoacaoId(doacao.id);
      setTokenConfirmacao(token);
      setPesoKg(doacao.pesoKg);
      setEtapa("sucesso");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui confirmar a doação.");
      setEtapa("pagamento");
    }
  }

  function recomecar() {
    setEtapa("dados");
    setNome("");
    setTelefone("");
    setParticipanteId("");
    setAceite(false);
    setRespostas({});
    setDoacaoId(null);
    setTokenConfirmacao(null);
    setPesoKg(0);
    setValor(0);
    setErro(null);
  }

  const conteudo = (() => {
    if (etapa === "pagamento") {
      return <TelaPagamento nome={nome.trim()} evento={evento} participante={participante} aoVoltar={() => setEtapa("dados")} aoIrParaEspera={irParaEspera} />;
    }
    if (etapa === "espera") {
      return <TelaEspera valor={valor} pesoKg={pesoKg} segundosParaConfirmar={evento.segundosConfirmacao} aoConfirmar={confirmarPix} aoVoltar={() => setEtapa("pagamento")} />;
    }
    if (etapa === "sucesso" && doacaoId && tokenConfirmacao) {
      return <TelaSucesso doacaoId={doacaoId} tokenConfirmacao={tokenConfirmacao} nome={nome.trim()} evento={evento} participante={participante} pesoKg={pesoKg} valor={valor} aoRecomecar={recomecar} />;
    }

    return (
      <main className="tela">
        <div className="marca">
          <div className="marca-selos">
            {evento.logoMarca && <img src={evento.logoMarca} alt="Marca organizadora" />}
            {evento.logoMarca && evento.logoEvento && <span aria-hidden="true">×</span>}
            {evento.logoEvento && <img className="marca-laf" src={evento.logoEvento} alt="Evento" />}
          </div>
          <span className="evento-status">Doações até {prazo(evento)}</span>
          <h1>{evento.nome}</h1>
          <p>{evento.descricao}</p>
        </div>

        <Premios premios={evento.premios} resultado={evento.resultadoPremios} />

        {!evento.aberto ? (
          <section className="cartao centro evento-fechado">
            <h2>{Date.now() < new Date(evento.inicioEm).getTime() ? "As doações ainda não começaram" : "Este evento foi encerrado"}</h2>
            <p>Você ainda pode consultar o placar e conhecer os outros eventos.</p>
            <a className="botao" href={`/evento/${evento.slug}/ranking`}>Ver o placar</a>
          </section>
        ) : (
          <form
            className="cartao"
            onSubmit={(e) => {
              e.preventDefault();
              if (!dadosCompletos) {
                setErro("Preencha os campos obrigatórios e aceite o termo de dados.");
                return;
              }
              setErro(null);
              setEtapa("pagamento");
            }}
          >
            <div className="campo">
              <label htmlFor="nome">{evento.rotuloNome}</label>
              <input id="nome" type="text" autoComplete="name" placeholder={evento.placeholderNome} value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} />
            </div>

            {evento.pedirTelefone && (
              <div className="campo">
                <label htmlFor="telefone">
                  Telefone com DDD{evento.telefoneObrigatorio ? "" : " (opcional)"}
                </label>
                <input
                  id="telefone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="(00) 00000-0000"
                  value={formatarTelefone(telefone)}
                  onChange={(e) => setTelefone(digitosTelefone(e.target.value))}
                />
                {telefone && !telefoneValido(telefone) ? (
                  <span className="erro">Número incompleto. Confira o DDD e os dígitos.</span>
                ) : (
                  <span className="dica">Usamos só para falar com você sobre a doação.</span>
                )}
              </div>
            )}

            {evento.temParticipantes && (
              <div className="campo">
                <label htmlFor="participante">Escolha {evento.participanteSingular}</label>
                <select id="participante" value={participanteId} onChange={(e) => setParticipanteId(e.target.value)}>
                  <option value="">Selecione {evento.participanteSingular}</option>
                  {grupos.length > 1 || grupos[0] ? grupos.map((grupo) => (
                    <optgroup label={grupo || evento.participantePlural} key={grupo || "sem-grupo"}>
                      {evento.participantes.filter((item) => item.grupo === grupo).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                    </optgroup>
                  )) : evento.participantes.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                </select>
              </div>
            )}

            {evento.campos.map((campo) => (
              <CampoExtra key={campo.id} campo={campo} valor={respostas[campo.chave]} aoMudar={(novaResposta) => setRespostas((atuais) => ({ ...atuais, [campo.chave]: novaResposta }))} />
            ))}

            <label className="aceite">
              <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
              <span>Aceito o <button type="button" onClick={() => setMostrarTermo(true)}>termo de uso de dados</button>.</span>
            </label>

            {erro && <span className="erro">{erro}</span>}
            <button type="submit" className="botao" disabled={!dadosCompletos}>Eu quero doar</button>
          </form>
        )}

        <p className="rodape">
          <a href={`/evento/${evento.slug}/ranking`}>Ver o placar →</a>
          <span aria-hidden="true"> · </span>
          <a href="/eventos">Outros eventos</a>
        </p>
        {mostrarTermo && <TermoDados evento={evento} aoFechar={() => setMostrarTermo(false)} />}
      </main>
    );
  })();

  return <div className="tema-evento" style={estiloDoEvento(evento)}>{conteudo}</div>;
}
