/** Exporta as doações de um evento: npm run export-csv -- 16-laf */
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const diretorioDados = resolve(process.env.DATA_DIR?.trim() || join(process.cwd(), "data"));
const arquivoBanco = join(diretorioDados, "casa-caramelo.sqlite");
if (!existsSync(arquivoBanco)) throw new Error(`Banco não encontrado em ${arquivoBanco}`);

const db = new DatabaseSync(arquivoBanco, { readOnly: true });
const slug = process.argv[2];
const evento = slug
  ? db.prepare("SELECT id, slug, name FROM events WHERE slug = ?").get(slug)
  : db.prepare("SELECT id, slug, name FROM events ORDER BY featured DESC, starts_at DESC LIMIT 1").get();
if (!evento) throw new Error("Evento não encontrado.");

const doacoes = db.prepare(`
  SELECT d.id, d.donor_name AS nome, p.name AS participante, d.amount AS valor,
         d.weight_kg AS pesoKg, d.answers_json AS respostas, d.created_at AS criadoEm,
         d.confirmed_at AS confirmadoEm, d.shared_at AS compartilhadoEm
  FROM donations d
  LEFT JOIN participants p ON p.id = d.participant_id
  WHERE d.event_id = ?
  ORDER BY d.created_at
`).all(evento.id);

const celula = (valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`;
const colunas = ["id", "nome", "participante", "valor", "pesoKg", "respostas", "criadoEm", "confirmadoEm", "compartilhadoEm"];
const linhas = [colunas.join(","), ...doacoes.map((doacao) => colunas.map((coluna) => celula(doacao[coluna])).join(","))];
const destino = join(process.cwd(), `doacoes-${evento.slug}.csv`);
await writeFile(destino, `﻿${linhas.join("\n")}\n`, "utf8");

const confirmadas = doacoes.filter((doacao) => doacao.confirmadoEm);
const totalKg = confirmadas.reduce((soma, doacao) => soma + Number(doacao.pesoKg), 0);
const totalReais = confirmadas.reduce((soma, doacao) => soma + Number(doacao.valor), 0);
console.log(`${evento.name}: ${doacoes.length} doações (${confirmadas.length} confirmadas) → ${destino}`);
console.log(`Total: ${totalKg.toFixed(1)} kg · R$ ${totalReais.toFixed(2).replace(".", ",")}`);
