"use client";

import { useEffect, useState } from "react";

const CORES = ["#FECB00", "#9100E5", "#FFFDF7", "#FFE5A4", "#2C0020"];

/**
 * Chuva de confete da comemoração. É enfeite, então some sozinha depois de
 * alguns segundos e nem chega a ser montada para quem pediu menos animação.
 */
export function Confete({ pecas = 44 }: { pecas?: number }) {
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    const semAnimacao = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (semAnimacao) {
      setAtivo(false);
      return;
    }
    // Rajada curta: confete demais por cima do texto atrapalha a leitura.
    const fim = setTimeout(() => setAtivo(false), 3800);
    return () => clearTimeout(fim);
  }, []);

  if (!ativo) return null;

  return (
    <div className="confete" aria-hidden="true">
      {Array.from({ length: pecas }, (_, i) => {
        // Valores fixos por índice: o mesmo confete no servidor e no cliente.
        const esquerda = (i * 37) % 100;
        const atraso = ((i * 13) % 14) / 10;
        const duracao = 1.9 + ((i * 7) % 12) / 10;
        const giro = (i % 2 ? 1 : -1) * (180 + ((i * 29) % 360));
        const largura = 6 + (i % 4) * 2;
        return (
          <span
            key={i}
            style={{
              left: `${esquerda}%`,
              width: largura,
              height: largura * (i % 3 === 0 ? 1 : 1.8),
              background: CORES[i % CORES.length],
              borderRadius: i % 3 === 0 ? "50%" : "2px",
              animationDelay: `${atraso}s`,
              animationDuration: `${duracao}s`,
              ["--giro" as string]: `${giro}deg`,
            }}
          />
        );
      })}
    </div>
  );
}
