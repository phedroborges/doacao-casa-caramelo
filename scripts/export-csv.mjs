/**
 * Exporta as doações para CSV — para fechar as contas depois do evento.
 * Uso: npm run export-csv  (gera doacoes.csv na raiz do projeto)
 */
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const diretorioDados = resolve(process.env.DATA_DIR?.trim() || join(process.cwd(), "data"));
const origem = join(diretorioDados, "doacoes.json");
const destino = join(process.cwd(), "doacoes.csv");

const doacoes = JSON.parse(await readFile(origem, "utf8"));

const celula = (valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`;
const colunas = ["id", "nome", "atleticaId", "tipo", "valor", "pesoKg", "criadoEm", "confirmadoEm", "bombons"];

const linhas = [
  colunas.join(","),
  ...doacoes.map((doacao) =>
    colunas
      .map((coluna) =>
        coluna === "bombons" ? celula(doacao.bombons.join(" | ")) : celula(doacao[coluna]),
      )
      .join(","),
  ),
];

await writeFile(destino, `﻿${linhas.join("\n")}\n`, "utf8");

const confirmadas = doacoes.filter((doacao) => doacao.confirmadoEm);
const totalKg = confirmadas.reduce((soma, doacao) => soma + doacao.pesoKg, 0);
const totalReais = confirmadas.reduce((soma, doacao) => soma + doacao.valor, 0);

console.log(`${doacoes.length} doações (${confirmadas.length} confirmadas) → ${destino}`);
console.log(`Total: ${totalKg.toFixed(1)} kg de ração · R$ ${totalReais.toFixed(2).replace(".", ",")} em PIX`);
