/**
 * Persistência em arquivo JSON — simples de inspecionar e de levar embora
 * no fim do evento. As escritas passam por uma fila para que duas doações
 * simultâneas não sobrescrevam uma à outra.
 */

import { constants } from "node:fs";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { ATLETICAS, DESAFIO, reaisParaKg, type BombomId } from "./config";

/** PIX vira quilos pela conversão; ração entregue já vem em quilos. */
export type TipoDoacao = "pix" | "racao";

export type Doacao = {
  id: string;
  nome: string;
  /** Id da atlética, não o nome — o nome pode mudar, o id não. */
  atleticaId: string;
  tipo: TipoDoacao;
  /** Em reais. Zero nas doações de ração. */
  valor: number;
  /** O que conta para a meta. Nas doações PIX é o valor convertido. */
  pesoKg: number;
  criadoEm: string;
  confirmadoEm: string | null;
  bombons: BombomId[];
};

const DIRETORIO_DADOS = resolve(
  process.env.DATA_DIR?.trim() || join(process.cwd(), "data"),
);
const ARQUIVO = join(DIRETORIO_DADOS, "doacoes.json");

/** Usado pelo health check para confirmar que o volume persistente está acessível. */
export async function verificarPersistencia(): Promise<void> {
  await mkdir(DIRETORIO_DADOS, { recursive: true });
  await access(DIRETORIO_DADOS, constants.R_OK | constants.W_OK);
}

/** Fila de escrita: cada operação espera a anterior terminar. */
let fila: Promise<unknown> = Promise.resolve();

async function ler(): Promise<Doacao[]> {
  try {
    const bruto = await readFile(ARQUIVO, "utf8");
    const dados = JSON.parse(bruto);
    return Array.isArray(dados) ? dados : [];
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw erro;
  }
}

/** Grava em arquivo temporário e renomeia, para nunca deixar um JSON pela metade. */
async function gravar(doacoes: Doacao[]): Promise<void> {
  await mkdir(dirname(ARQUIVO), { recursive: true });
  const temporario = `${ARQUIVO}.${process.pid}.tmp`;
  await writeFile(temporario, JSON.stringify(doacoes, null, 2), "utf8");
  await rename(temporario, ARQUIVO);
}

/** Enfileira uma leitura+escrita atômica sobre a lista de doações. */
function transacao<T>(operacao: (doacoes: Doacao[]) => { doacoes: Doacao[]; resultado: T }): Promise<T> {
  const proxima = fila.then(async () => {
    const atuais = await ler();
    const { doacoes, resultado } = operacao(atuais);
    await gravar(doacoes);
    return resultado;
  });
  // A fila segue mesmo se esta operação falhar, para não travar as próximas.
  fila = proxima.catch(() => {});
  return proxima;
}

export function listarDoacoes(): Promise<Doacao[]> {
  return ler();
}

export function criarDoacao(dados: {
  nome: string;
  atleticaId: string;
  tipo: TipoDoacao;
  /** Reais quando tipo = pix; quilos quando tipo = racao. */
  quantidade: number;
}): Promise<Doacao> {
  return transacao((doacoes) => {
    const ehPix = dados.tipo === "pix";
    const valor = ehPix ? Math.round(dados.quantidade * 100) / 100 : 0;
    const pesoKg = ehPix
      ? reaisParaKg(valor)
      : Math.round(dados.quantidade * 100) / 100;

    const doacao: Doacao = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      nome: dados.nome,
      atleticaId: dados.atleticaId,
      tipo: dados.tipo,
      valor,
      pesoKg,
      criadoEm: new Date().toISOString(),
      // Ração é entregue na mão da equipe, então já nasce confirmada.
      confirmadoEm: ehPix ? null : new Date().toISOString(),
      bombons: [],
    };
    return { doacoes: [...doacoes, doacao], resultado: doacao };
  });
}

export function confirmarDoacao(id: string): Promise<Doacao | null> {
  return transacao((doacoes) => {
    let alvo: Doacao | null = null;
    const atualizadas = doacoes.map((doacao) => {
      if (doacao.id !== id) return doacao;
      // Reconfirmar não muda o horário já registrado.
      alvo = { ...doacao, confirmadoEm: doacao.confirmadoEm ?? new Date().toISOString() };
      return alvo;
    });
    return { doacoes: atualizadas, resultado: alvo };
  });
}

export function registrarBombom(id: string, bombom: BombomId): Promise<Doacao | null> {
  return transacao((doacoes) => {
    let alvo: Doacao | null = null;
    const atualizadas = doacoes.map((doacao) => {
      if (doacao.id !== id) return doacao;
      const bombons = doacao.bombons.includes(bombom)
        ? doacao.bombons
        : [...doacao.bombons, bombom];
      alvo = { ...doacao, bombons };
      return alvo;
    });
    return { doacoes: atualizadas, resultado: alvo };
  });
}

export type LinhaRanking = {
  atleticaId: string;
  nome: string;
  chave: "A" | "B";
  logo: string;
  /** O que conta para a meta. */
  pesoKg: number;
  /** Quanto da meta já foi batido, em % (pode passar de 100). */
  percentual: number;
  bateuMeta: boolean;
  /** Quebra do peso por origem, para o dashboard mostrar de onde veio. */
  kgDeRacao: number;
  kgDePix: number;
  reais: number;
  doacoes: number;
};

export type Ranking = {
  linhas: LinhaRanking[];
  metaKg: number;
  totalKg: number;
  totalReais: number;
  doacoes: number;
  atleticasNaMeta: number;
  atualizadoEm: string;
};

/** Só doações confirmadas entram no ranking. */
export async function calcularRanking(): Promise<Ranking> {
  const confirmadas = (await ler()).filter((doacao) => doacao.confirmadoEm);

  // Toda atlética aparece no ranking desde o começo, mesmo zerada:
  // num jogo, quem está em último também precisa se ver no placar.
  const linhas: LinhaRanking[] = ATLETICAS.map((atletica) => {
    const doacoes = confirmadas.filter((doacao) => doacao.atleticaId === atletica.id);
    const pesoKg = doacoes.reduce((soma, doacao) => soma + doacao.pesoKg, 0);
    const kgDeRacao = doacoes
      .filter((doacao) => doacao.tipo === "racao")
      .reduce((soma, doacao) => soma + doacao.pesoKg, 0);

    return {
      atleticaId: atletica.id,
      nome: atletica.nome,
      chave: atletica.chave,
      logo: atletica.logo,
      pesoKg: Math.round(pesoKg * 100) / 100,
      percentual: Math.round((pesoKg / DESAFIO.metaKg) * 1000) / 10,
      bateuMeta: pesoKg >= DESAFIO.metaKg,
      kgDeRacao: Math.round(kgDeRacao * 100) / 100,
      kgDePix: Math.round((pesoKg - kgDeRacao) * 100) / 100,
      reais: doacoes.reduce((soma, doacao) => soma + doacao.valor, 0),
      doacoes: doacoes.length,
    };
  }).sort((a, b) => b.pesoKg - a.pesoKg || b.doacoes - a.doacoes);

  return {
    linhas,
    metaKg: DESAFIO.metaKg,
    totalKg: Math.round(linhas.reduce((soma, linha) => soma + linha.pesoKg, 0) * 100) / 100,
    totalReais: confirmadas.reduce((soma, doacao) => soma + doacao.valor, 0),
    doacoes: confirmadas.length,
    atleticasNaMeta: linhas.filter((linha) => linha.bateuMeta).length,
    atualizadoEm: new Date().toISOString(),
  };
}
