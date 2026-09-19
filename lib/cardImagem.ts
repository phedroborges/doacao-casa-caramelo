/** Geração do card vertical de compartilhamento no próprio navegador. */

import type { EventoPublico, Participante } from "./modelos";

export const FORMATO_STORY = { largura: 1080, altura: 1920 } as const;

export type DadosCard = {
  pesoKg: number;
  evento: EventoPublico;
  participante: Participante | null;
};

export async function carregarFontes(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all([
    document.fonts.load('400 180px "Ketchup Manis"'),
    document.fonts.load('700 52px "Just Sans"'),
    document.fonts.load('800 52px "Just Sans"'),
  ]);
  await document.fonts.ready;
}

function mancha(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  giro: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(giro);
  ctx.beginPath();
  ctx.moveTo(-rx, 0);
  ctx.bezierCurveTo(-rx, -ry * 1.25, rx * 0.55, -ry * 1.35, rx, -ry * 0.35);
  ctx.bezierCurveTo(rx * 1.25, ry * 0.55, rx * 0.15, ry * 1.3, -rx * 0.35, ry * 0.95);
  ctx.bezierCurveTo(-rx * 0.95, ry * 0.75, -rx, ry * 0.4, -rx, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Não consegui carregar ${src}`));
    img.src = src;
  });
}

function desenharContida(
  ctx: CanvasRenderingContext2D,
  imagem: HTMLImageElement,
  x: number,
  y: number,
  largura: number,
  altura: number,
) {
  const escala = Math.min(largura / imagem.width, altura / imagem.height);
  const larguraFinal = imagem.width * escala;
  const alturaFinal = imagem.height * escala;
  ctx.drawImage(
    imagem,
    x + (largura - larguraFinal) / 2,
    y + (altura - alturaFinal) / 2,
    larguraFinal,
    alturaFinal,
  );
}

function textoQueCabe(
  ctx: CanvasRenderingContext2D,
  texto: string,
  larguraMaxima: number,
  fonte: (tamanho: number) => string,
  tamanhoInicial: number,
  tamanhoMinimo = 24,
) {
  let tamanho = tamanhoInicial;
  ctx.font = fonte(tamanho);
  while (ctx.measureText(texto).width > larguraMaxima && tamanho > tamanhoMinimo) {
    tamanho -= 2;
    ctx.font = fonte(tamanho);
  }
  return tamanho;
}

function quebrarLinhas(
  ctx: CanvasRenderingContext2D,
  texto: string,
  larguraMaxima: number,
): string[] {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of palavras) {
    const candidata = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(candidata).width <= larguraMaxima) atual = candidata;
    else {
      if (atual) linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

export function formatarReais(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(valor) ? 0 : 2,
  });
}

export function formatarKg(valor: number): string {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} KG`;
}

export function preencherTextoCompartilhamento(evento: EventoPublico, pesoKg: number): string {
  return evento.textoCompartilhamento
    .replaceAll("{kg}", formatarKg(pesoKg))
    .replaceAll("{beneficiario}", evento.beneficiario)
    .replaceAll("{evento}", evento.nome)
    .trim();
}

export async function desenharCard(canvas: HTMLCanvasElement, dados: DadosCard): Promise<void> {
  const { largura, altura } = FORMATO_STORY;
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível neste navegador.");

  const centroX = largura / 2;
  const larguraUtil = largura - 160;
  const corFundo = dados.evento.corPrimaria;
  const corDestaque = dados.evento.corDestaque;
  const corEscura = "#2C0020";
  const corClara = "#FFFDF7";

  ctx.fillStyle = corFundo;
  ctx.fillRect(0, 0, largura, altura);
  ctx.fillStyle = "rgba(44,0,32,0.12)";
  mancha(ctx, 80, 80, 470, 175, -0.28);
  mancha(ctx, 1040, 1110, 340, 135, 0.5);
  mancha(ctx, 70, 1830, 420, 120, 0.18);

  const imagens = await Promise.allSettled(
    [dados.evento.logoEvento, dados.evento.logoMarca, dados.participante?.imagem]
      .map((src) => (src ? carregarImagem(src) : Promise.reject(new Error("sem imagem")))),
  );
  if (imagens[0]?.status === "fulfilled") desenharContida(ctx, imagens[0].value, 90, 230, 300, 150);
  if (imagens[1]?.status === "fulfilled") desenharContida(ctx, imagens[1].value, 455, 230, 170, 150);
  if (imagens[2]?.status === "fulfilled") {
    ctx.fillStyle = corClara;
    ctx.beginPath();
    ctx.arc(835, 305, 82, 0, Math.PI * 2);
    ctx.fill();
    desenharContida(ctx, imagens[2].value, 780, 250, 110, 110);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = corClara;
  const tamanhoEvento = textoQueCabe(
    ctx,
    dados.evento.nome,
    larguraUtil,
    (tamanho) => `800 ${tamanho}px "Just Sans", sans-serif`,
    44,
  );
  ctx.font = `800 ${tamanhoEvento}px "Just Sans", sans-serif`;
  ctx.fillText(dados.evento.nome.toUpperCase(), centroX, 430);

  ctx.font = '800 52px "Just Sans", sans-serif';
  ctx.letterSpacing = "0.15em";
  ctx.fillText("EU ACABEI DE DOAR", centroX, 530);
  ctx.letterSpacing = "0px";

  const peso = formatarKg(dados.pesoKg);
  const tamanhoPeso = textoQueCabe(
    ctx,
    peso,
    larguraUtil,
    (tamanho) => `400 ${tamanho}px "Ketchup Manis", sans-serif`,
    225,
  );
  ctx.font = `400 ${tamanhoPeso}px "Ketchup Manis", sans-serif`;
  ctx.lineJoin = "round";
  ctx.lineWidth = 26;
  ctx.strokeStyle = corEscura;
  ctx.strokeText(peso, centroX, 610);
  ctx.fillStyle = corDestaque;
  ctx.fillText(peso, centroX, 610);

  let mensagem = preencherTextoCompartilhamento(dados.evento, dados.pesoKg);
  const prefixo = new RegExp(
    `^Eu acabei de doar\\s+${peso.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+de ração\\s+`,
    "i",
  );
  mensagem = mensagem.replace(prefixo, "");
  ctx.fillStyle = corClara;
  ctx.font = '800 58px "Just Sans", sans-serif';
  const linhas = quebrarLinhas(ctx, mensagem.toUpperCase(), larguraUtil).slice(0, 7);
  const alturaLinha = 76;
  const inicioTexto = 915 + Math.max(0, (6 - linhas.length) * 20);
  linhas.forEach((linha, indice) => ctx.fillText(linha, centroX, inicioTexto + indice * alturaLinha));

  ctx.strokeStyle = "rgba(255,253,247,0.52)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(centroX - 150, 1510);
  ctx.lineTo(centroX + 150, 1510);
  ctx.stroke();

  if (dados.participante) {
    const meta = dados.participante.metaKg ?? dados.evento.metaKg;
    ctx.fillStyle = corClara;
    ctx.font = '800 42px "Just Sans", sans-serif';
    ctx.fillText(`Meta: ${meta.toLocaleString("pt-BR")} kg por ${dados.evento.participanteSingular}`, centroX, 1560);
  }
  if (dados.evento.instagram) {
    ctx.fillStyle = corClara;
    ctx.font = '800 50px "Just Sans", sans-serif';
    ctx.fillText(`@${dados.evento.instagram}`, centroX, 1640);
  }
}

export function canvasParaBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não consegui gerar a imagem."))),
      "image/png",
    );
  });
}
