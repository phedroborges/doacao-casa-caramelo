"use client";

import type { Premio } from "@/lib/modelos";

type Props = {
  premios: Premio[];
  valor?: number;
  aoEscolherValor?: (valor: number) => void;
  compacta?: boolean;
  resultado?: string;
};

const reais = (valor: number) =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });

export function Premios({ premios, valor, aoEscolherValor, compacta, resultado }: Props) {
  if (!premios.length) return null;
  const ativo = typeof valor === "number" && valor > 0;

  return (
    <section className="premios" data-compacta={compacta} aria-label="Prêmios da campanha">
      <header>
        <span className="chapeu">Doando você pode concorrer a</span>
        {!compacta && <h2>{premios.length === 1 ? "Um prêmio" : `${premios.length} prêmios`}</h2>}
      </header>

      <div className="premios-grade">
        {premios.map((premio) => {
          const alcancado = ativo && valor >= premio.valorMinimo;
          const falta = ativo ? Math.max(0, premio.valorMinimo - valor) : 0;
          const mostrarAtalho = ativo && !alcancado && Boolean(aoEscolherValor);

          return (
            <article
              key={premio.id}
              className="premio-item"
              data-alcancado={ativo ? alcancado : undefined}
            >
              <div className="premio-linha">
                {premio.imagem && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={premio.imagem} alt={premio.nome} />
                )}
                <div className="premio-info">
                  <strong>{premio.nome}</strong>
                  {!compacta && premio.detalhe && <small>{premio.detalhe}</small>}
                  {ativo ? (
                    <span className="premio-selo">
                      {alcancado ? "✓ Concorrendo" : `Falta ${reais(falta)}`}
                    </span>
                  ) : (
                    <span className="premio-regra">
                      {premio.regra ||
                        (premio.valorMinimo > 0
                          ? `Doações a partir de ${reais(premio.valorMinimo)}`
                          : "Qualquer doação concorre")}
                    </span>
                  )}
                </div>
              </div>

              {mostrarAtalho && (
                <button
                  type="button"
                  className="premio-atalho"
                  onClick={() => aoEscolherValor?.(premio.valorMinimo)}
                >
                  Falta {reais(falta)} para você concorrer a {premio.nome.toLocaleLowerCase("pt-BR")}
                </button>
              )}
            </article>
          );
        })}
      </div>

      {!compacta && resultado && <p className="premios-rodape">Resultado: {resultado}.</p>}
    </section>
  );
}
