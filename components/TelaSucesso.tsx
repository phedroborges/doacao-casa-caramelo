"use client";

import { useEffect, useRef, useState } from "react";
import type { EventoPublico, Participante } from "@/lib/modelos";
import {
  canvasParaBlob,
  carregarFontes,
  desenharCard,
  formatarKg,
  preencherTextoCompartilhamento,
} from "@/lib/cardImagem";
import { Confete } from "@/components/Confete";

type Props = {
  doacaoId: string;
  tokenConfirmacao: string;
  nome: string;
  evento: EventoPublico;
  participante: Participante | null;
  pesoKg: number;
  valor: number;
  aoRecomecar: () => void;
};

export function TelaSucesso({
  doacaoId,
  tokenConfirmacao,
  nome,
  evento,
  participante,
  pesoKg,
  valor,
  aoRecomecar,
}: Props) {
  const [arquivoCard, setArquivoCard] = useState<File | null>(null);
  const [compartilhou, setCompartilhou] = useState(false);
  const [seguiu, setSeguiu] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!evento.compartilhamentoAtivo) return;
    let cancelado = false;
    (async () => {
      await carregarFontes();
      const elemento = canvas.current ?? document.createElement("canvas");
      canvas.current = elemento;
      await desenharCard(elemento, { evento, participante, pesoKg });
      const blob = await canvasParaBlob(elemento);
      if (!cancelado) {
        setArquivoCard(new File([blob], `${evento.slug}-story.png`, { type: "image/png" }));
      }
    })().catch(() => {
      if (!cancelado) setAviso("Não consegui preparar o card para o Story.");
    });
    return () => {
      cancelado = true;
    };
  }, [evento, participante, pesoKg]);

  async function registrarCompartilhamento() {
    await fetch(`/api/doacoes/${doacaoId}/compartilhar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenConfirmacao }),
    }).catch(() => {});
  }

  const textoDoPost = `${preencherTextoCompartilhamento(evento, pesoKg)}${
    evento.instagram ? ` @${evento.instagram}` : ""
  }`;

  async function compartilhar() {
    if (arquivoCard && navigator.canShare?.({ files: [arquivoCard] })) {
      try {
        await navigator.share({ files: [arquivoCard], text: textoDoPost });
        setCompartilhou(true);
        await registrarCompartilhamento();
        return;
      } catch (erro) {
        if (erro instanceof Error && erro.name === "AbortError") return;
      }
    }

    setAviso(
      window.isSecureContext
        ? "Este navegador não consegue enviar a imagem para outros aplicativos. Abra no Safari ou Chrome do celular."
        : "O compartilhamento direto precisa de um endereço HTTPS. No endereço local HTTP ele fica bloqueado pelo celular.",
    );
  }

  async function seguirInstagram() {
    window.open(`https://instagram.com/${evento.instagram}`, "_blank", "noopener");
    setSeguiu(true);
  }

  const premiosAlcancados = evento.premios.filter((premio) => valor >= premio.valorMinimo);

  return (
    <main className="tela">
      <Confete />
      <canvas ref={canvas} hidden aria-hidden="true" />

      <div className="selo-ok" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="#2C0020" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <div className="centro">
        <h2 className="titulo">Doação registrada!</h2>
        <p className="subtitulo">
          <strong>{formatarKg(pesoKg)}</strong> para {evento.beneficiario}
          {participante ? <>, apoiando <strong>{participante.nome}</strong></> : null}. Obrigado, {nome.split(" ")[0]}! 🐶
        </p>
      </div>

      {evento.premios.length > 0 && (
        <section className="sorteios-ok">
          <span className="chapeu">Você está concorrendo a</span>
          <ul>
            {evento.premios.map((premio) => {
              const alcancado = valor >= premio.valorMinimo;
              return (
                <li key={premio.id} data-alcancado={alcancado}>
                  {premio.imagem && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={premio.imagem} alt="" />
                  )}
                  <span>{premio.nome}</span>
                  <b>{alcancado ? "✓" : "—"}</b>
                </li>
              );
            })}
          </ul>
          {premiosAlcancados.length < evento.premios.length && (
            <p className="sorteios-nota">Você pode fazer outra doação para alcançar os demais prêmios.</p>
          )}
          {evento.resultadoPremios && <p className="sorteios-rodape">Resultado: {evento.resultadoPremios}.</p>}
        </section>
      )}

      {evento.compartilhamentoAtivo && (
        <section className="bombom-bloco" data-feito={compartilhou}>
          <span className="bombom-chamada">{evento.chamadaCompartilhamento}</span>
          {evento.recompensaCompartilhamentoTitulo && (
            <h3><span aria-hidden="true">🍬</span> {evento.recompensaCompartilhamentoTitulo}</h3>
          )}

          <ol className="bombom-passos">
            <li data-feito={compartilhou}><span className="numero">1</span><span>Compartilhe o card nos seus Stories</span></li>
            {evento.instagram && (
              <>
                <li data-feito={compartilhou}><span className="numero">2</span><span>Marque @{evento.instagram} no Story</span></li>
                <li data-feito={seguiu}><span className="numero">3</span><span>Siga @{evento.instagram} no Instagram</span></li>
              </>
            )}
          </ol>

          <button type="button" className="botao" onClick={compartilhar} disabled={!arquivoCard}>
            {arquivoCard ? (compartilhou ? "✓ Compartilhar de novo" : "Publicar no Instagram Stories") : "Preparando o Story..."}
          </button>
          {evento.instagram && (
            <button type="button" className="botao roxo" onClick={seguirInstagram}>
              {seguiu ? `✓ Seguindo @${evento.instagram}` : `Seguir @${evento.instagram}`}
            </button>
          )}
          {evento.recompensaCompartilhamentoDescricao && (
            <p className="bombom-retirada"><span aria-hidden="true">📍</span> {evento.recompensaCompartilhamentoDescricao}</p>
          )}
        </section>
      )}

      {aviso && <p className="centro subtitulo" style={{ fontWeight: 800 }}>{aviso}</p>}
      <button type="button" className="botao contorno" onClick={aoRecomecar}>Fazer outra doação</button>
      <p className="rodape"><a href={`/evento/${evento.slug}/ranking`}>Ver o placar do evento →</a></p>
    </main>
  );
}
