/**
 * Gera o card vertical de compartilhamento da Casa Caramelo.
 *
 * O canvas roda no navegador. A imagem não é enviada ao servidor e fica
 * pronta para ser entregue à bandeja de compartilhamento do celular.
 */

import { DESAFIO, EVENTO } from "./config";

export const CORES = {
  rosa: "#FF0197",
  fundo: "#2C0020",
  amarelo: "#FECB00",
  branco: "#FFFDF7",
};

export const FORMATO_STORY = { largura: 1080, altura: 1920 } as const;

export type DadosCard = {
  pesoKg: number;
  logoAtletica: string;
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

export async function desenharCard(
  canvas: HTMLCanvasElement,
  dados: DadosCard,
): Promise<void> {
  const { largura, altura } = FORMATO_STORY;
  canvas.width = largura;
  canvas.height = altura;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível neste navegador.");

  const centroX = largura / 2;
  const larguraUtil = largura - 160;

  ctx.fillStyle = CORES.rosa;
  ctx.fillRect(0, 0, largura, altura);

  ctx.fillStyle = "rgba(44,0,32,0.12)";
  mancha(ctx, 80, 80, 470, 175, -0.28);
  mancha(ctx, 1040, 1110, 340, 135, 0.5);
  mancha(ctx, 70, 1830, 420, 120, 0.18);

  // As três marcas aparecem juntas, sem competir com a mensagem da doação.
  const [laf, casa, atletica] = await Promise.allSettled([
    carregarImagem("/marca/laf-branco.png"),
    carregarImagem("/marca/logo/casa-caramelo-amarelo.png"),
    carregarImagem(dados.logoAtletica),
  ]);

  if (laf.status === "fulfilled") {
    desenharContida(ctx, laf.value, 90, 286, 300, 130);
  }
  if (casa.status === "fulfilled") {
    desenharContida(ctx, casa.value, 455, 276, 170, 150);
  }
  if (atletica.status === "fulfilled") {
    ctx.fillStyle = CORES.branco;
    ctx.beginPath();
    ctx.arc(835, 351, 82, 0, Math.PI * 2);
    ctx.fill();
    desenharContida(ctx, atletica.value, 780, 296, 110, 110);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  ctx.fillStyle = CORES.branco;
  ctx.font = '800 52px "Just Sans", sans-serif';
  ctx.letterSpacing = "0.15em";
  ctx.fillText("EU ACABEI DE DOAR", centroX, 520);
  ctx.letterSpacing = "0px";

  const peso = formatarKg(dados.pesoKg);
  const tamanhoPeso = textoQueCabe(
    ctx,
    peso,
    larguraUtil,
    (tamanho) => `400 ${tamanho}px "Ketchup Manis", sans-serif`,
    235,
  );
  ctx.font = `400 ${tamanhoPeso}px "Ketchup Manis", sans-serif`;
  ctx.lineJoin = "round";
  ctx.lineWidth = 28;
  ctx.strokeStyle = CORES.fundo;
  ctx.strokeText(peso, centroX, 604);
  ctx.fillStyle = CORES.amarelo;
  ctx.fillText(peso, centroX, 604);

  ctx.fillStyle = CORES.branco;
  ctx.font = '700 48px "Just Sans", sans-serif';
  ctx.fillText("DE RAÇÃO PARA OS", centroX, 858);

  const tamanhoMineiros = textoQueCabe(
    ctx,
    "AUMIGOS DE MINEIROS",
    larguraUtil,
    (tamanho) => `400 ${tamanho}px "Ketchup Manis", sans-serif`,
    98,
  );
  ctx.font = `400 ${tamanhoMineiros}px "Ketchup Manis", sans-serif`;
  ctx.lineWidth = 12;
  ctx.strokeStyle = CORES.fundo;
  ctx.strokeText("AUMIGOS DE MINEIROS", centroX, 938);
  ctx.fillStyle = CORES.branco;
  ctx.fillText("AUMIGOS DE MINEIROS", centroX, 938);

  ctx.fillStyle = CORES.branco;
  ctx.font = '700 48px "Just Sans", sans-serif';
  ctx.fillText("E TE CONVIDO A", centroX, 1082);

  const tamanhoConvite = textoQueCabe(
    ctx,
    "DOAR TAMBÉM.",
    larguraUtil,
    (tamanho) => `400 ${tamanho}px "Ketchup Manis", sans-serif`,
    150,
  );
  ctx.font = `400 ${tamanhoConvite}px "Ketchup Manis", sans-serif`;
  ctx.lineWidth = 18;
  ctx.strokeStyle = CORES.fundo;
  ctx.strokeText("DOAR TAMBÉM.", centroX, 1165);
  ctx.fillStyle = CORES.amarelo;
  ctx.fillText("DOAR TAMBÉM.", centroX, 1165);

  ctx.strokeStyle = "rgba(255,253,247,0.52)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(centroX - 150, 1460);
  ctx.lineTo(centroX + 150, 1460);
  ctx.stroke();

  ctx.fillStyle = CORES.branco;
  ctx.font = '800 44px "Just Sans", sans-serif';
  ctx.fillText(`Meta: ${DESAFIO.metaKg} kg por atlética`, centroX, 1510);

  ctx.font = '800 50px "Just Sans", sans-serif';
  ctx.fillText(`@${EVENTO.instagram}`, centroX, 1590);
}

export function canvasParaBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não consegui gerar a imagem."))),
      "image/png",
    );
  });
}
