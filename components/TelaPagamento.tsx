"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { DESAFIO, VALOR_PARA_CAIXA, reaisParaKg, type Atletica } from "@/lib/config";
import { gerarBrCode } from "@/lib/pix";
import { formatarReais } from "@/lib/cardImagem";
import { Premios } from "@/components/Premios";

type LinhaMeta = {
  atleticaId: string;
  pesoKg: number;
  percentual: number;
  bateuMeta: boolean;
};

type Props = {
  nome: string;
  atletica: Atletica;
  aoVoltar: () => void;
  /** Copiar o código já leva para a espera — o pagamento começou ali. */
  aoIrParaEspera: (valor: number) => void;
};

export function TelaPagamento({ nome, atletica, aoVoltar, aoIrParaEspera }: Props) {
  const [valorTexto, setValorTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [linhaMeta, setLinhaMeta] = useState<LinhaMeta | null>(null);
  const campoValor = useRef<HTMLInputElement>(null);

  const valor = useMemo(() => {
    const limpo = valorTexto.replace(/\./g, "").replace(",", ".");
    const numero = Number(limpo);
    return Number.isFinite(numero) ? numero : 0;
  }, [valorTexto]);

  const valorValido = valor >= DESAFIO.valorMinimo;
  const pesoEquivalente = reaisParaKg(valor);
  const faltaParaMetaKg = linhaMeta
    ? Math.max(0, DESAFIO.metaKg - linhaMeta.pesoKg)
    : null;
  const faltaParaMetaReais = faltaParaMetaKg === null
    ? null
    : faltaParaMetaKg * DESAFIO.reaisPorKg;
  const pesoComDoacao = linhaMeta ? linhaMeta.pesoKg + pesoEquivalente : null;

  // O BR Code é montado aqui mesmo: o QR acompanha o valor enquanto se digita.
  const brCode = useMemo(
    () => (valorValido ? gerarBrCode(Math.round(valor * 100) / 100) : null),
    [valor, valorValido],
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
    let cancelado = false;
    fetch("/api/ranking", { cache: "no-store" })
      .then((resposta) => {
        if (!resposta.ok) throw new Error("Não consegui carregar a meta.");
        return resposta.json() as Promise<{ linhas: LinhaMeta[] }>;
      })
      .then((ranking) => {
        if (!cancelado) {
          setLinhaMeta(
            ranking.linhas.find((linha) => linha.atleticaId === atletica.id) ?? null,
          );
        }
      })
      .catch(() => {
        if (!cancelado) setLinhaMeta(null);
      });
    return () => {
      cancelado = true;
    };
  }, [atletica.id]);

  async function copiarEAvancar() {
    if (!brCode || !valorValido) return;
    try {
      await navigator.clipboard.writeText(brCode);
    } catch {
      // Safari sem permissão de área de transferência: seleciona para copiar na mão.
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
        <span aria-hidden="true">←</span> {nome.split(" ")[0]} · {atletica.nome}
      </button>

      {/* Os prêmios ficam no topo: é o motivo de a pessoa estar aqui. */}
      <Premios
        compacta
        pesoKg={valorValido ? pesoEquivalente : undefined}
        aoSubirParaCaixa={() => setValorTexto(String(VALOR_PARA_CAIXA))}
      />

      <section className="meta-doacao" aria-label={`Meta da ${atletica.nome}`}>
        <div className="meta-doacao-cabeca">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={atletica.logo} alt="" />
          <div>
            <span>Meta da {atletica.nome}</span>
            {linhaMeta ? (
              <strong>
                {linhaMeta.pesoKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg de{" "}
                {DESAFIO.metaKg} kg
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
                Faltam <strong>{faltaParaMetaKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</strong>
                {" "}(R$ {faltaParaMetaReais.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}) para bater a meta.
              </>
            )}
          </p>
        )}

        {valorValido && pesoComDoacao !== null && !linhaMeta?.bateuMeta && (
          <small>
            {pesoComDoacao >= DESAFIO.metaKg
              ? "Com a sua doação, a atlética bate a meta! 🎉"
              : `Com a sua doação, ela chega a ${pesoComDoacao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg.`}
          </small>
        )}
      </section>

      <div className="cartao cartao-valor">
        <div className="campo">
          <label htmlFor="valor">Quanto você vai doar?</label>
          <input
            id="valor"
            ref={campoValor}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={`Mínimo R$ ${DESAFIO.valorMinimo},00`}
            value={valorTexto}
            onChange={(evento) => setValorTexto(evento.target.value.replace(/[^\d.,]/g, ""))}
          />
        </div>

        <div className="valores valores-doacao">
          {DESAFIO.valoresSugeridos.map((sugestao) => (
            <button
              key={sugestao}
              type="button"
              data-destaque={sugestao === DESAFIO.valorSacoRacao}
              aria-pressed={valor === sugestao}
              onClick={() => setValorTexto(String(sugestao))}
            >
              <span>R$ {sugestao}</span>
              {sugestao === DESAFIO.valorSacoRacao && (
                <small>1 saco · {DESAFIO.pesoSacoRacaoKg} kg</small>
              )}
            </button>
          ))}
        </div>

        {valorTexto !== "" && !valorValido && (
          <span className="erro">O valor mínimo é R$ {DESAFIO.valorMinimo},00.</span>
        )}
      </div>

      {valorValido && brCode ? (
        <div className="pagar">
          <div className="pagar-qr">
            {qrDataUrl ? (
              // A imagem vem de um data URL gerado aqui; next/image não agrega nada.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt={`QR Code PIX de ${formatarReais(valor)}`} />
            ) : (
              <div className="anel" style={{ width: 44, height: 44, borderWidth: 5 }} />
            )}
            <div className="pagar-resumo">
              <strong>{formatarReais(valor)}</strong>
              <span>
                = {pesoEquivalente.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg de
                ração
              </span>
              <small>O valor já vem preenchido no seu banco.</small>
            </div>
          </div>

          <button type="button" className="botao" onClick={copiarEAvancar}>
            Copiar código PIX
          </button>
          <button type="button" className="botao-texto" onClick={() => aoIrParaEspera(Math.round(valor * 100) / 100)}>
            Já paguei escaneando o QR Code
          </button>
        </div>
      ) : (
        <div className="cartao centro">
          <p className="subtitulo" style={{ margin: 0 }}>
            Escolha um valor e o PIX aparece aqui. 🐶
          </p>
        </div>
      )}

      {erro && (
        <p className="centro" style={{ color: "var(--ameixa)", fontWeight: 800 }}>
          {erro}
        </p>
      )}
    </main>
  );
}
