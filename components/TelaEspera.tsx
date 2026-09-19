"use client";

import { useEffect, useRef, useState } from "react";
import { DESAFIO } from "@/lib/config";
import { formatarReais } from "@/lib/cardImagem";

type Props = {
  valor: number;
  pesoKg: number;
  aoConfirmar: () => void;
  aoVoltar: () => void;
};

/**
 * Espera do pagamento. Não existe contador na tela: ver "30, 29, 28..."
 * entrega que é tempo fixo, e não uma consulta ao banco. O que aparece é o
 * loading girando e mensagens que trocam, como num app que está checando.
 * O "Já paguei" só fica ativo depois de alguns segundos, para o doador não
 * pular a etapa antes de abrir o banco.
 */
export function TelaEspera({ valor, pesoKg, aoConfirmar, aoVoltar }: Props) {
  const [segundos, setSegundos] = useState(0);
  const [enviando, setEnviando] = useState(false);
  // Sem a trava, dois toques rápidos criariam duas doações.
  const jaConfirmou = useRef(false);

  useEffect(() => {
    const intervalo = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(intervalo);
  }, []);

  const botaoLiberado = segundos >= DESAFIO.segundosParaLiberarBotao;

  const mensagens = [
    "Abrindo a fila de pagamentos...",
    "Aguardando o PIX cair...",
    "Conferindo com o recebedor...",
  ];
  const mensagem = mensagens[Math.min(Math.floor(segundos / 5), mensagens.length - 1)];

  function confirmar() {
    if (jaConfirmou.current) return;
    jaConfirmou.current = true;
    setEnviando(true);
    aoConfirmar();
  }

  return (
    <main className="tela tela-espera">
      <button type="button" className="voltar" onClick={aoVoltar} disabled={enviando}>
        <span aria-hidden="true">←</span> Voltar para o PIX
      </button>

      <div className="espera">
        <div className="anel" />
        <div>
          <h2 className="titulo">Aguardando pagamento</h2>
          <p className="subtitulo">
            <strong>{formatarReais(valor)}</strong> ={" "}
            <strong>{pesoKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</strong> de
            ração
          </p>
        </div>
        <p className="espera-mensagem" aria-live="polite">
          {mensagem}
        </p>
      </div>

      <div className="espera-acoes">
        <button
          type="button"
          className="botao"
          onClick={confirmar}
          disabled={!botaoLiberado || enviando}
        >
          {enviando ? "Confirmando..." : "Já paguei"}
        </button>
        <p className="centro subtitulo" style={{ fontSize: 13 }}>
          {botaoLiberado
            ? "Confirme assim que o PIX sair do seu banco."
            : "Cole o código no seu banco e conclua o pagamento."}
        </p>
      </div>
    </main>
  );
}
