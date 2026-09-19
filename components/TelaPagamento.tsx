"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { gerarBrCode } from "@/lib/pix";
import type { EventoPublico, Participante } from "@/lib/modelos";
import { formatarReais } from "@/lib/cardImagem";
import { Premios } from "@/components/Premios";

type LinhaMeta = {
  participanteId: string;
  pesoKg: number;
  percentual: number;
  bateuMeta: boolean;
  metaKg: number;
};

type Props = {
  nome: string;
  evento: EventoPublico;
  participante: Participante | null;
  aoVoltar: () => void;
  aoIrParaEspera: (valor: number) => void;
};

export function TelaPagamento({ nome, evento, participante, aoVoltar, aoIrParaEspera }: Props) {
  const [valorTexto, setValorTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [linhaMeta, setLinhaMeta] = useState<LinhaMeta | null>(null);
  const campoValor = useRef<HTMLInputElement>(null);

  const valor = useMemo(() => {
    const limpo = valorTexto.replace(/\./g, "").replace(",", ".");
    const convertido = Number(limpo);
    return Number.isFinite(convertido) ? convertido : 0;
  }, [valorTexto]);

  const valorValido = valor >= evento.valorMinimo;
  const pesoEquivalente = Math.round((valor / evento.reaisPorKg) * 100) / 100;
  const metaParticipante = participante?.metaKg ?? evento.metaKg;
  const faltaParaMetaKg = linhaMeta ? Math.max(0, linhaMeta.metaKg - linhaMeta.pesoKg) : null;
  const faltaParaMetaReais = faltaParaMetaKg === null ? null : faltaParaMetaKg * evento.reaisPorKg;
  const pesoComDoacao = linhaMeta ? linhaMeta.pesoKg + pesoEquivalente : null;

  const brCode = useMemo(
    () => (valorValido ? gerarBrCode(Math.round(valor * 100) / 100, evento) : null),
    [evento, valor, valorValido],
  );

  useEffect(() => {
    if (!brCode) {
      setQrDataUrl(null);
      return;
    }
    let cancelado = false;
    QRCode.toDataURL(brCode, {
      width: 420,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#2C0020", light: "#FFFFFF" },
    })
      .then((url) => {
        if (!cancelado) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelado) setErro("Não consegui gerar o QR Code. Use o código abaixo.");
      });
    return () => {
      cancelado = true;
    };
  }, [brCode]);

  useEffect(() => {
    if (!participante) return;
    let cancelado = false;
    fetch(`/api/ranking?evento=${encodeURIComponent(evento.id)}`, { cache: "no-store" })
      .then((resposta) => {
        if (!resposta.ok) throw new Error("Não consegui carregar a meta.");
        return resposta.json() as Promise<{ linhas: LinhaMeta[] }>;
      })
      .then((ranking) => {
        if (!cancelado) {
          setLinhaMeta(
            ranking.linhas.find((linha) => linha.participanteId === participante.id) ?? null,
          );
        }
      })
      .catch(() => {
        if (!cancelado) setLinhaMeta(null);
      });
    return () => {
      cancelado = true;
    };
  }, [evento.id, participante?.id]);

  async function copiarEAvancar() {
    if (!brCode || !valorValido) return;
    try {
      await navigator.clipboard.writeText(brCode);
    } catch {
      const area = document.createElement("textarea");
      area.value = brCode;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    aoIrParaEspera(Math.round(valor * 100) / 100);
  }

  return (
    <main className="tela tela-pagamento">
      <button type="button" className="voltar" onClick={aoVoltar}>
        <span aria-hidden="true">←</span> {nome.split(" ")[0]}
        {participante ? ` · ${participante.nome}` : ""}
      </button>

      <Premios
        premios={evento.premios}
        compacta
        valor={valorValido ? valor : undefined}
        aoEscolherValor={(novoValor) => setValorTexto(String(novoValor))}
      />

      {participante && (
        <section className="meta-doacao" aria-label={`Meta de ${participante.nome}`}>
          <div className="meta-doacao-cabeca">
            {participante.imagem && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={participante.imagem} alt="" />
            )}
            <div>
              <span>Meta de {participante.nome}</span>
              {linhaMeta ? (
                <strong>
                  {linhaMeta.pesoKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg de{" "}
                  {linhaMeta.metaKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg
                </strong>
              ) : (
                <strong>Carregando o placar...</strong>
              )}
            </div>
          </div>

          <div className="meta-doacao-trilho" aria-hidden="true">
            <span style={{ width: `${Math.min(100, linhaMeta?.percentual ?? 0)}%` }} />
          </div>

          {linhaMeta && faltaParaMetaKg !== null && faltaParaMetaReais !== null && (
            <p>
              {linhaMeta.bateuMeta ? (
                <>Meta batida! Sua doação aumenta ainda mais o impacto.</>
              ) : (
                <>
                  Faltam <strong>{faltaParaMetaKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</strong>{" "}
                  ({formatarReais(faltaParaMetaReais)}) para bater a meta.
                </>
              )}
            </p>
          )}

          {valorValido && pesoComDoacao !== null && !linhaMeta?.bateuMeta && (
            <small>
              {pesoComDoacao >= metaParticipante
                ? `Com a sua doação, ${participante.nome} bate a meta! 🎉`
                : `Com a sua doação, chega a ${pesoComDoacao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg.`}
            </small>
          )}
        </section>
      )}

      <div className="cartao cartao-valor">
        <div className="campo">
          <label htmlFor="valor">Quanto você vai doar?</label>
          <input
            id="valor"
            ref={campoValor}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={`Mínimo ${formatarReais(evento.valorMinimo)}`}
            value={valorTexto}
            onChange={(mudanca) => setValorTexto(mudanca.target.value.replace(/[^\d.,]/g, ""))}
          />
        </div>

        <div className="valores valores-doacao">
          {evento.valoresSugeridos.map((sugestao) => (
            <button
              key={sugestao}
              type="button"
              data-destaque={sugestao === evento.valorSaco && evento.pesoSacoKg > 0}
              aria-pressed={valor === sugestao}
              onClick={() => setValorTexto(String(sugestao))}
            >
              <span>{formatarReais(sugestao)}</span>
              {sugestao === evento.valorSaco && evento.pesoSacoKg > 0 && (
                <small>1 saco · {evento.pesoSacoKg.toLocaleString("pt-BR")} kg</small>
              )}
            </button>
          ))}
        </div>

        {valorTexto !== "" && !valorValido && (
          <span className="erro">O valor mínimo é {formatarReais(evento.valorMinimo)}.</span>
        )}
      </div>

      {valorValido && brCode ? (
        <div className="pagar">
          <div className="pagar-qr">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt={`QR Code PIX de ${formatarReais(valor)}`} />
            ) : (
              <div className="anel" style={{ width: 44, height: 44, borderWidth: 5 }} />
            )}
            <div className="pagar-resumo">
              <strong>{formatarReais(valor)}</strong>
              <span>= {pesoEquivalente.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg de ração</span>
              <small>{evento.pixValorEmbutido ? "O valor já vem preenchido no seu banco." : "Digite o valor no seu banco."}</small>
            </div>
          </div>

          <button type="button" className="botao" onClick={copiarEAvancar}>Copiar código PIX</button>
          <button type="button" className="botao-texto" onClick={() => aoIrParaEspera(Math.round(valor * 100) / 100)}>Já paguei escaneando o QR Code</button>
        </div>
      ) : (
        <div className="cartao centro"><p className="subtitulo" style={{ margin: 0 }}>Escolha um valor e o PIX aparece aqui. 🐶</p></div>
      )}

      {erro && <p className="centro" style={{ color: "var(--ameixa)", fontWeight: 800 }}>{erro}</p>}
    </main>
  );
}
