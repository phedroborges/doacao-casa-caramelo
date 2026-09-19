"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BOMBOM,
  DESAFIO,
  EVENTO,
  SORTEIOS,
  VALOR_PARA_CAIXA,
  concorreACaixa,
  type Atletica,
  type BombomId,
} from "@/lib/config";
import {
  canvasParaBlob,
  carregarFontes,
  desenharCard,
  formatarKg,
} from "@/lib/cardImagem";
import { Confete } from "@/components/Confete";

type Props = {
  doacaoId: string;
  nome: string;
  atletica: Atletica;
  pesoKg: number;
  aoRecomecar: () => void;
};

export function TelaSucesso({ doacaoId, nome, atletica, pesoKg, aoRecomecar }: Props) {
  const [arquivoCard, setArquivoCard] = useState<File | null>(null);
  const [compartilhou, setCompartilhou] = useState(false);
  const [seguiu, setSeguiu] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  const pegouCaixa = concorreACaixa(pesoKg);

  // Deixa o arquivo pronto antes do clique para preservar a ativação do usuário
  // exigida pela bandeja nativa de compartilhamento.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      await carregarFontes();
      const elemento = canvas.current ?? document.createElement("canvas");
      canvas.current = elemento;
      await desenharCard(elemento, { logoAtletica: atletica.logo, pesoKg });
      const blob = await canvasParaBlob(elemento);
      if (!cancelado) {
        setArquivoCard(new File([blob], "doacao-casa-caramelo-story.png", { type: "image/png" }));
      }
    })().catch(() => {
      if (!cancelado) setAviso("Não consegui preparar o card para o Story.");
    });
    return () => {
      cancelado = true;
    };
  }, [atletica.logo, pesoKg]);

  const registrarBombom = useCallback(
    async (bombom: BombomId) => {
      // Marca na tela primeiro; se a gravação falhar, não trava o doador.
      await fetch(`/api/doacoes/${doacaoId}/bombom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bombom }),
      }).catch(() => {});
    },
    [doacaoId],
  );

  const textoDoPost = `Eu acabei de doar ${formatarKg(pesoKg)} de ração para os aumigos de Mineiros e te convido a doar também. @${EVENTO.instagram}`;

  async function compartilhar() {
    if (arquivoCard && navigator.canShare?.({ files: [arquivoCard] })) {
      try {
        await navigator.share({ files: [arquivoCard], text: textoDoPost });
        setCompartilhou(true);
        await registrarBombom("compartilhar");
        return;
      } catch (erro) {
        // O doador pode ter fechado a bandeja — aí não é erro nenhum.
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
    window.open(`https://instagram.com/${EVENTO.instagram}`, "_blank", "noopener");
    setSeguiu(true);
    await registrarBombom("seguir");
  }

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
          <strong>{formatarKg(pesoKg)}</strong> para {EVENTO.beneficiario}, na conta da{" "}
          <strong>{atletica.nome}</strong>. Obrigado, {nome.split(" ")[0]}! 🐶
        </p>
      </div>

      {/* Confirmação dos sorteios — sem contagem de cupom. */}
      <section className="sorteios-ok">
        <span className="chapeu">Você está concorrendo a</span>
        <ul>
          {SORTEIOS.itens.map((item) => {
            const alcancado = item.todos || pegouCaixa;
            return (
              <li key={item.id} data-alcancado={alcancado}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imagem} alt="" />
                <span>{item.nome}</span>
                <b>{alcancado ? "✓" : "—"}</b>
              </li>
            );
          })}
        </ul>
        {!pegouCaixa && (
          <p className="sorteios-nota">
            A caixa de som é só para doações de R$ {VALOR_PARA_CAIXA} pra cima.
            Dá para doar de novo e concorrer.
          </p>
        )}
        <p className="sorteios-rodape">
          Resultado dia {SORTEIOS.resultado}, com {SORTEIOS.apuracao}.
        </p>
      </section>

      {/* O bombom: um prêmio, três passos, sem sutileza. */}
      <section className="bombom-bloco" data-feito={compartilhou}>
        <span className="bombom-chamada">{BOMBOM.chamada}</span>
        <h3>
          <span aria-hidden="true">🍬</span> {BOMBOM.titulo}
        </h3>

        <ol className="bombom-passos">
          <li data-feito={compartilhou}>
            <span className="numero">1</span>
            <span>{BOMBOM.passos[0]}</span>
          </li>
          <li data-feito={compartilhou}>
            <span className="numero">2</span>
            <span>{BOMBOM.passos[1]}</span>
          </li>
          <li data-feito={seguiu}>
            <span className="numero">3</span>
            <span>{BOMBOM.passos[2]}</span>
          </li>
        </ol>

        <button type="button" className="botao" onClick={compartilhar} disabled={!arquivoCard}>
          {arquivoCard
            ? compartilhou
              ? "✓ Compartilhar de novo"
              : "Publicar no Instagram Stories"
            : "Preparando o Story..."}
        </button>
        <button type="button" className="botao roxo" onClick={seguirInstagram}>
          {seguiu ? `✓ Seguindo @${EVENTO.instagram}` : `Seguir @${EVENTO.instagram}`}
        </button>

        <p className="bombom-retirada">
          <span aria-hidden="true">📍</span> {BOMBOM.retirada}
        </p>
      </section>

      {aviso && (
        <p className="centro subtitulo" style={{ fontWeight: 800 }}>
          {aviso}
        </p>
      )}

      <button type="button" className="botao contorno" onClick={aoRecomecar}>
        Fazer outra doação
      </button>

      <p className="rodape">
        <a href="/ranking">Ver o placar do desafio →</a>
      </p>
    </main>
  );
}
