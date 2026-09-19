"use client";

import { SORTEIOS, concorreACaixa, faltaParaCaixaEmReais } from "@/lib/config";

type Props = {
  /** Peso da doação em curso. Sem ele a vitrine fica só apresentando. */
  pesoKg?: number;
  /** Chamado pelo botão que completa a doação até alcançar a caixa de som. */
  aoSubirParaCaixa?: () => void;
  /** No topo da tela de pagamento a vitrine precisa ocupar pouca altura. */
  compacta?: boolean;
};

/**
 * Vitrine dos dois sorteios. Com `pesoKg` ela acende e diz, sem contar
 * cupons, se a doação já está concorrendo. Quando falta para a caixa de som,
 * oferece o atalho para completar — é o empurrão para subir a doação.
 */
export function Premios({ pesoKg, aoSubirParaCaixa, compacta }: Props) {
  const ativo = typeof pesoKg === "number" && pesoKg > 0;
  const pegouCaixa = ativo && concorreACaixa(pesoKg);

  const faltam = ativo ? faltaParaCaixaEmReais(pesoKg) : 0;
  const valorFaltante = `R$ ${faltam.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
  const rotuloFalta = `Falta ${valorFaltante}`;
  const rotuloAtalho = `Falta ${valorFaltante} para você concorrer a caixa`;

  return (
    <section className="premios" data-compacta={compacta} aria-label="Sorteios da campanha">
      <header>
        <span className="chapeu">Doando você concorre a</span>
        {!compacta && <h2>Dois sorteios</h2>}
      </header>

      <div className="premios-grade">
        {SORTEIOS.itens.map((item) => {
          const alcancado = ativo && (item.todos || pegouCaixa);
          const mostrarAtalho =
            ativo && !item.todos && !pegouCaixa && Boolean(aoSubirParaCaixa);

          return (
            <article
              key={item.id}
              className="premio-item"
              data-alcancado={ativo ? alcancado : undefined}
            >
              <div className="premio-linha">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imagem} alt={item.nome} />
                <div className="premio-info">
                  <strong>{item.nome}</strong>
                  {!compacta && <small>{item.detalhe}</small>}
                  {ativo ? (
                    <span className="premio-selo">
                      {alcancado ? "✓ Concorrendo" : rotuloFalta}
                    </span>
                  ) : (
                    <span className="premio-regra">{item.regra}</span>
                  )}
                </div>
              </div>

              {mostrarAtalho && (
                <button type="button" className="premio-atalho" onClick={aoSubirParaCaixa}>
                  {rotuloAtalho}
                </button>
              )}
            </article>
          );
        })}
      </div>

      {!compacta && (
        <p className="premios-rodape">
          Resultado dia {SORTEIOS.resultado}, com {SORTEIOS.apuracao}.
        </p>
      )}
    </section>
  );
}
