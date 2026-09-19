import "server-only";

import { constants, existsSync, mkdirSync, readFileSync } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync, type StatementResultingChanges } from "node:sqlite";
import type {
  CampoFormulario,
  DadosCampo,
  DadosEvento,
  DadosParticipante,
  DadosPremio,
  Doacao,
  Evento,
  EventoPublico,
  Participante,
  Premio,
  Ranking,
  StatusEvento,
  TipoCampo,
} from "./modelos";

export const DIRETORIO_DADOS = resolve(
  process.env.DATA_DIR?.trim() || join(process.cwd(), "data"),
);
const ARQUIVO_BANCO = join(DIRETORIO_DADOS, "casa-caramelo.sqlite");
const ARQUIVO_LEGADO = join(DIRETORIO_DADOS, "doacoes.json");

type Linha = Record<string, unknown>;
type BancoGlobal = typeof globalThis & { __bancoCasaCaramelo?: DatabaseSync };

const agoraIso = () => new Date().toISOString();
const booleano = (valor: unknown) => Number(valor) === 1;
const numero = (valor: unknown, fallback = 0) => {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : fallback;
};
const texto = (valor: unknown, fallback = "") =>
  typeof valor === "string" ? valor : fallback;

function json<T>(valor: unknown, fallback: T): T {
  try {
    return typeof valor === "string" ? (JSON.parse(valor) as T) : fallback;
  } catch {
    return fallback;
  }
}

const CONFIGURACAO_PADRAO = {
  temParticipantes: true,
  participanteSingular: "atlética",
  participantePlural: "atléticas",
  rotuloNome: "Seu nome",
  placeholderNome: "Como te chamam?",
  metaKg: 100,
  reaisPorKg: 5,
  valorMinimo: 5,
  valorSaco: 125,
  pesoSacoKg: 25,
  valoresSugeridos: [10, 25, 50, 125],
  segundosConfirmacao: 12,
  instagram: "casacaramelo.myn",
  pixChave: "ea6bb940-294b-4730-9d90-0aa5eb08e0fc",
  pixNome: "F C LUCIANO  LTDA",
  pixCidade: "RIO DE JANEIRO",
  pixCodigoEstatico:
    "00020126580014br.gov.bcb.pix0136ea6bb940-294b-4730-9d90-0aa5eb08e0fc5204000053039865802BR5917F C LUCIANO  LTDA6014RIO DE JANEIRO62070503***63044A75",
  pixValorEmbutido: true,
  compartilhamentoAtivo: true,
  textoCompartilhamento:
    "Eu acabei de doar {kg} de ração para {beneficiario} e te convido a doar também.",
  chamadaCompartilhamento: "Compartilhe e convide mais gente para doar",
  recompensaCompartilhamentoTitulo: "Compartilhe e ganhe um bombom",
  recompensaCompartilhamentoDescricao:
    "Marque a Casa Caramelo e mostre o Story no stand para retirar.",
  termoDados:
    "Seus dados serão usados apenas para registrar a doação, organizar o ranking e prestar contas do evento.",
  logoMarca: "/marca/logo/casa-caramelo-amarelo.png",
  logoEvento: "/marca/laf-branco.png",
  corPrimaria: "#FF0197",
  corSecundaria: "#9100E5",
  corDestaque: "#FECB00",
  corFundoCartao: "#FFF4DC",
  premioCompeticaoTitulo: "Prêmio surpresa",
  premioCompeticaoDescricao: "A participante campeã leva um prêmio especial.",
  resultadoPremios: "24 de outubro, às 21h",
} satisfies Omit<
  Evento,
  | "id"
  | "slug"
  | "nome"
  | "subtitulo"
  | "descricao"
  | "beneficiario"
  | "status"
  | "destaque"
  | "inicioEm"
  | "fimEm"
  | "fusoHorario"
  | "criadoEm"
  | "atualizadoEm"
>;

function configuracaoDoEvento(evento: DadosEvento | Evento) {
  return {
    temParticipantes: evento.temParticipantes,
    participanteSingular: evento.participanteSingular,
    participantePlural: evento.participantePlural,
    rotuloNome: evento.rotuloNome,
    placeholderNome: evento.placeholderNome,
    metaKg: evento.metaKg,
    reaisPorKg: evento.reaisPorKg,
    valorMinimo: evento.valorMinimo,
    valorSaco: evento.valorSaco,
    pesoSacoKg: evento.pesoSacoKg,
    valoresSugeridos: evento.valoresSugeridos,
    segundosConfirmacao: evento.segundosConfirmacao,
    instagram: evento.instagram,
    pixChave: evento.pixChave,
    pixNome: evento.pixNome,
    pixCidade: evento.pixCidade,
    pixCodigoEstatico: evento.pixCodigoEstatico,
    pixValorEmbutido: evento.pixValorEmbutido,
    compartilhamentoAtivo: evento.compartilhamentoAtivo,
    textoCompartilhamento: evento.textoCompartilhamento,
    chamadaCompartilhamento: evento.chamadaCompartilhamento,
    recompensaCompartilhamentoTitulo: evento.recompensaCompartilhamentoTitulo,
    recompensaCompartilhamentoDescricao: evento.recompensaCompartilhamentoDescricao,
    termoDados: evento.termoDados,
    logoMarca: evento.logoMarca,
    logoEvento: evento.logoEvento,
    corPrimaria: evento.corPrimaria,
    corSecundaria: evento.corSecundaria,
    corDestaque: evento.corDestaque,
    corFundoCartao: evento.corFundoCartao,
    premioCompeticaoTitulo: evento.premioCompeticaoTitulo,
    premioCompeticaoDescricao: evento.premioCompeticaoDescricao,
    resultadoPremios: evento.resultadoPremios,
  };
}

function mapearEvento(linha: Linha): Evento {
  const configuracao = {
    ...CONFIGURACAO_PADRAO,
    ...json<Partial<typeof CONFIGURACAO_PADRAO>>(linha.config_json, {}),
  };

  return {
    id: texto(linha.id),
    slug: texto(linha.slug),
    nome: texto(linha.name),
    subtitulo: texto(linha.subtitle),
    descricao: texto(linha.description),
    beneficiario: texto(linha.beneficiary),
    status: texto(linha.status, "rascunho") as StatusEvento,
    destaque: booleano(linha.featured),
    inicioEm: texto(linha.starts_at),
    fimEm: texto(linha.ends_at),
    fusoHorario: texto(linha.timezone, "America/Sao_Paulo"),
    ...configuracao,
    criadoEm: texto(linha.created_at),
    atualizadoEm: texto(linha.updated_at),
  };
}

function mapearParticipante(linha: Linha): Participante {
  return {
    id: texto(linha.id),
    eventoId: texto(linha.event_id),
    nome: texto(linha.name),
    slug: texto(linha.slug),
    grupo: texto(linha.group_name),
    imagem: texto(linha.image_url),
    metaKg: linha.goal_kg === null ? null : numero(linha.goal_kg),
    ativo: booleano(linha.active),
    ordem: numero(linha.sort_order),
  };
}

function mapearPremio(linha: Linha): Premio {
  return {
    id: texto(linha.id),
    eventoId: texto(linha.event_id),
    nome: texto(linha.name),
    detalhe: texto(linha.detail),
    imagem: texto(linha.image_url),
    regra: texto(linha.rule_text),
    valorMinimo: numero(linha.minimum_amount),
    ativo: booleano(linha.active),
    ordem: numero(linha.sort_order),
  };
}

function mapearCampo(linha: Linha): CampoFormulario {
  return {
    id: texto(linha.id),
    eventoId: texto(linha.event_id),
    chave: texto(linha.field_key),
    rotulo: texto(linha.label),
    tipo: texto(linha.field_type, "texto") as TipoCampo,
    obrigatorio: booleano(linha.required),
    placeholder: texto(linha.placeholder),
    opcoes: json<string[]>(linha.options_json, []),
    ativo: booleano(linha.active),
    ordem: numero(linha.sort_order),
  };
}

function mapearDoacao(linha: Linha): Doacao {
  return {
    id: texto(linha.id),
    eventoId: texto(linha.event_id),
    participanteId: linha.participant_id ? texto(linha.participant_id) : null,
    nome: texto(linha.donor_name),
    valor: numero(linha.amount),
    pesoKg: numero(linha.weight_kg),
    respostas: json<Record<string, string | boolean>>(linha.answers_json, {}),
    criadoEm: texto(linha.created_at),
    confirmadoEm: linha.confirmed_at ? texto(linha.confirmed_at) : null,
    compartilhadoEm: linha.shared_at ? texto(linha.shared_at) : null,
  };
}

function inicializar(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      beneficiary TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('rascunho', 'publicado', 'encerrado')),
      featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
      config_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      group_name TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      goal_kg REAL,
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(event_id, slug)
    );

    CREATE TABLE IF NOT EXISTS prizes (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      rule_text TEXT NOT NULL DEFAULT '',
      minimum_amount REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS form_fields (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      field_key TEXT NOT NULL,
      label TEXT NOT NULL,
      field_type TEXT NOT NULL CHECK (field_type IN ('texto', 'texto_longo', 'selecao', 'checkbox')),
      required INTEGER NOT NULL DEFAULT 0 CHECK (required IN (0, 1)),
      placeholder TEXT NOT NULL DEFAULT '',
      options_json TEXT NOT NULL DEFAULT '[]',
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(event_id, field_key)
    );

    CREATE TABLE IF NOT EXISTS donations (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
      participant_id TEXT REFERENCES participants(id) ON DELETE SET NULL,
      donor_name TEXT NOT NULL,
      amount REAL NOT NULL,
      weight_kg REAL NOT NULL,
      answers_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      confirmed_at TEXT,
      shared_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id, active, sort_order);
    CREATE INDEX IF NOT EXISTS idx_prizes_event ON prizes(event_id, active, sort_order);
    CREATE INDEX IF NOT EXISTS idx_fields_event ON form_fields(event_id, active, sort_order);
    CREATE INDEX IF NOT EXISTS idx_donations_event ON donations(event_id, confirmed_at);
  `);

  semearEventoInicial(db);
  importarJsonLegado(db);
}

function semearEventoInicial(db: DatabaseSync) {
  const existe = db.prepare("SELECT id FROM events LIMIT 1").get();
  if (existe) return;

  const id = "evento-laf-16";
  const criadoEm = agoraIso();
  const dados: DadosEvento = {
    slug: "16-laf",
    nome: "16ª LAF",
    subtitulo: "Desafio Casa Caramelo · LAF Goiás",
    descricao: "Ajude os aumigos de Mineiros e leve sua atlética até a meta.",
    beneficiario: "os aumigos de Mineiros",
    status: "publicado",
    destaque: true,
    inicioEm: "2026-09-19T00:00:00-03:00",
    fimEm: "2026-10-24T21:00:00-03:00",
    fusoHorario: "America/Sao_Paulo",
    ...CONFIGURACAO_PADRAO,
  };

  db.prepare(`
    INSERT INTO events (
      id, slug, name, subtitle, description, beneficiary, status, featured,
      starts_at, ends_at, timezone, config_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    dados.slug,
    dados.nome,
    dados.subtitulo,
    dados.descricao,
    dados.beneficiario,
    dados.status,
    1,
    dados.inicioEm,
    dados.fimEm,
    dados.fusoHorario,
    JSON.stringify(configuracaoDoEvento(dados)),
    criadoEm,
    criadoEm,
  );

  const participantes = [
    ["mercenaria", "Mercenária", "Chave A", "/atleticas/mercenaria.png"],
    ["supinada", "Supinada", "Chave A", "/atleticas/supinada.png"],
    ["milionaria", "Milionária", "Chave A", "/atleticas/milionaria.png"],
    ["metaneira", "Metaneira", "Chave A", "/atleticas/metaneira.png"],
    ["agrotoxicos", "Agrotóxicos", "Chave B", "/atleticas/agrotoxicos.png"],
    ["hematose", "Hematose", "Chave B", "/atleticas/hematose.png"],
    ["fulminante", "Fulminante", "Chave B", "/atleticas/fulminante.png"],
    ["sistematica", "Sistemática", "Chave B", "/atleticas/sistematica.png"],
  ];
  const inserirParticipante = db.prepare(`
    INSERT INTO participants (
      id, event_id, name, slug, group_name, image_url, goal_kg, active, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, 1, ?)
  `);
  participantes.forEach(([slug, nome, grupo, imagem], indice) =>
    inserirParticipante.run(`participante-${slug}`, id, nome, slug, grupo, imagem, indice),
  );

  const inserirPremio = db.prepare(`
    INSERT INTO prizes (
      id, event_id, name, detail, image_url, rule_text, minimum_amount, active, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);
  inserirPremio.run(
    "premio-airfryer",
    id,
    "Air Fryer",
    "Multi MF1300 · 4,4 litros",
    "/premios/air-fryer.png",
    "Qualquer doação concorre",
    0,
    0,
  );
  inserirPremio.run(
    "premio-caixa",
    id,
    "Caixa de som",
    "WAAW by Alok · 180W RMS · à prova d'água",
    "/premios/caixa-som.png",
    "Doações de R$ 50 pra cima",
    50,
    1,
  );
}

function importarJsonLegado(db: DatabaseSync) {
  const importado = db
    .prepare("SELECT value FROM schema_meta WHERE key = 'legacy_json_imported'")
    .get();
  if (importado) return;

  try {
    if (existsSync(ARQUIVO_LEGADO)) {
      const doacoes = JSON.parse(readFileSync(ARQUIVO_LEGADO, "utf8")) as Array<{
        id?: string;
        nome?: string;
        atleticaId?: string;
        valor?: number;
        pesoKg?: number;
        criadoEm?: string;
        confirmadoEm?: string | null;
        bombons?: string[];
      }>;
      const participante = db.prepare(
        "SELECT id FROM participants WHERE event_id = ? AND slug = ?",
      );
      const inserir = db.prepare(`
        INSERT OR IGNORE INTO donations (
          id, event_id, participant_id, donor_name, amount, weight_kg,
          answers_json, created_at, confirmed_at, shared_at
        ) VALUES (?, ?, ?, ?, ?, ?, '{}', ?, ?, ?)
      `);
      for (const doacao of Array.isArray(doacoes) ? doacoes : []) {
        const linhaParticipante = participante.get(
          "evento-laf-16",
          doacao.atleticaId ?? "",
        ) as Linha | undefined;
        inserir.run(
          doacao.id || randomUUID(),
          "evento-laf-16",
          texto(linhaParticipante?.id) || null,
          doacao.nome || "Doador",
          numero(doacao.valor),
          numero(doacao.pesoKg),
          doacao.criadoEm || agoraIso(),
          doacao.confirmadoEm ?? null,
          doacao.bombons?.includes("compartilhar") ? doacao.confirmadoEm ?? agoraIso() : null,
        );
      }
    }
  } finally {
    db.prepare("INSERT OR REPLACE INTO schema_meta (key, value) VALUES (?, ?)").run(
      "legacy_json_imported",
      agoraIso(),
    );
  }
}

function banco(): DatabaseSync {
  const escopoGlobal = globalThis as BancoGlobal;
  if (escopoGlobal.__bancoCasaCaramelo) return escopoGlobal.__bancoCasaCaramelo;

  mkdirSync(DIRETORIO_DADOS, { recursive: true });
  const db = new DatabaseSync(ARQUIVO_BANCO);
  inicializar(db);
  escopoGlobal.__bancoCasaCaramelo = db;
  return db;
}

export function normalizarSlug(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function dadosNovoEvento(): DadosEvento {
  const inicio = new Date();
  const fim = new Date(inicio.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    slug: "novo-evento",
    nome: "Novo evento",
    subtitulo: "Campanha Casa Caramelo",
    descricao: "Ajude esta campanha e acompanhe o impacto da sua doação.",
    beneficiario: "os aumigos que precisam",
    status: "rascunho",
    destaque: false,
    inicioEm: inicio.toISOString(),
    fimEm: fim.toISOString(),
    fusoHorario: "America/Sao_Paulo",
    ...CONFIGURACAO_PADRAO,
    logoEvento: "",
    premioCompeticaoTitulo: "",
    premioCompeticaoDescricao: "",
    resultadoPremios: "",
  };
}

export async function verificarPersistencia(): Promise<void> {
  await mkdir(DIRETORIO_DADOS, { recursive: true });
  await access(DIRETORIO_DADOS, constants.R_OK | constants.W_OK);
  banco().prepare("SELECT 1 AS ok").get();
}

export function listarEventosAdmin(): Evento[] {
  return (banco().prepare("SELECT * FROM events ORDER BY starts_at DESC").all() as Linha[]).map(
    mapearEvento,
  );
}

export function listarEventosPublicos(): EventoPublico[] {
  return (
    banco()
      .prepare("SELECT * FROM events WHERE status != 'rascunho' ORDER BY featured DESC, starts_at DESC")
      .all() as Linha[]
  ).map((linha) => completarEvento(mapearEvento(linha), true));
}

export function buscarEventoPorId(id: string): Evento | null {
  const linha = banco().prepare("SELECT * FROM events WHERE id = ?").get(id) as Linha | undefined;
  return linha ? mapearEvento(linha) : null;
}

export function buscarEventoPorSlug(slug: string): Evento | null {
  const linha = banco().prepare("SELECT * FROM events WHERE slug = ?").get(slug) as Linha | undefined;
  return linha ? mapearEvento(linha) : null;
}

export function buscarEventoDestaque(): EventoPublico | null {
  const linha = banco()
    .prepare(
      "SELECT * FROM events WHERE status != 'rascunho' ORDER BY featured DESC, starts_at DESC LIMIT 1",
    )
    .get() as Linha | undefined;
  return linha ? completarEvento(mapearEvento(linha), true) : null;
}

export function buscarEventoPublicoPorSlug(slug: string): EventoPublico | null {
  const evento = buscarEventoPorSlug(slug);
  if (!evento || evento.status === "rascunho") return null;
  return completarEvento(evento, true);
}

export function buscarEventoCompletoPorId(id: string): EventoPublico | null {
  const evento = buscarEventoPorId(id);
  return evento ? completarEvento(evento, false) : null;
}

function completarEvento(evento: Evento, apenasAtivos: boolean): EventoPublico {
  return {
    ...evento,
    participantes: listarParticipantes(evento.id, apenasAtivos),
    premios: listarPremios(evento.id, apenasAtivos),
    campos: listarCampos(evento.id, apenasAtivos),
    aberto: eventoEstaAberto(evento),
  };
}

export function eventoEstaAberto(evento: Evento, instante = new Date()): boolean {
  if (evento.status !== "publicado") return false;
  const agora = instante.getTime();
  return agora >= new Date(evento.inicioEm).getTime() && agora <= new Date(evento.fimEm).getTime();
}

export function criarEvento(dados: DadosEvento): Evento {
  const db = banco();
  const id = randomUUID();
  const instante = agoraIso();
  if (dados.destaque) db.exec("UPDATE events SET featured = 0");
  db.prepare(`
    INSERT INTO events (
      id, slug, name, subtitle, description, beneficiary, status, featured,
      starts_at, ends_at, timezone, config_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    dados.slug,
    dados.nome,
    dados.subtitulo,
    dados.descricao,
    dados.beneficiario,
    dados.status,
    dados.destaque ? 1 : 0,
    dados.inicioEm,
    dados.fimEm,
    dados.fusoHorario,
    JSON.stringify(configuracaoDoEvento(dados)),
    instante,
    instante,
  );
  return buscarEventoPorId(id)!;
}

export function atualizarEvento(id: string, dados: DadosEvento): Evento {
  const db = banco();
  if (dados.destaque) {
    db.prepare("UPDATE events SET featured = 0 WHERE id != ?").run(id);
  }
  db.prepare(`
    UPDATE events SET
      slug = ?, name = ?, subtitle = ?, description = ?, beneficiary = ?,
      status = ?, featured = ?, starts_at = ?, ends_at = ?, timezone = ?,
      config_json = ?, updated_at = ?
    WHERE id = ?
  `).run(
    dados.slug,
    dados.nome,
    dados.subtitulo,
    dados.descricao,
    dados.beneficiario,
    dados.status,
    dados.destaque ? 1 : 0,
    dados.inicioEm,
    dados.fimEm,
    dados.fusoHorario,
    JSON.stringify(configuracaoDoEvento(dados)),
    agoraIso(),
    id,
  );
  return buscarEventoPorId(id)!;
}

export function excluirEvento(id: string): StatementResultingChanges {
  return banco().prepare("DELETE FROM events WHERE id = ?").run(id);
}

export function listarParticipantes(eventoId: string, apenasAtivos = false): Participante[] {
  const filtro = apenasAtivos ? " AND active = 1" : "";
  return (
    banco()
      .prepare(`SELECT * FROM participants WHERE event_id = ?${filtro} ORDER BY sort_order, name`)
      .all(eventoId) as Linha[]
  ).map(mapearParticipante);
}

export function buscarParticipante(id: string): Participante | null {
  const linha = banco().prepare("SELECT * FROM participants WHERE id = ?").get(id) as
    | Linha
    | undefined;
  return linha ? mapearParticipante(linha) : null;
}

export function criarParticipante(eventoId: string, dados: DadosParticipante): Participante {
  const id = randomUUID();
  banco()
    .prepare(`
      INSERT INTO participants (
        id, event_id, name, slug, group_name, image_url, goal_kg, active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      eventoId,
      dados.nome,
      dados.slug,
      dados.grupo,
      dados.imagem,
      dados.metaKg,
      dados.ativo ? 1 : 0,
      dados.ordem,
    );
  return buscarParticipante(id)!;
}

export function atualizarParticipante(id: string, dados: DadosParticipante): Participante {
  banco()
    .prepare(`
      UPDATE participants SET
        name = ?, slug = ?, group_name = ?, image_url = ?, goal_kg = ?, active = ?, sort_order = ?
      WHERE id = ?
    `)
    .run(
      dados.nome,
      dados.slug,
      dados.grupo,
      dados.imagem,
      dados.metaKg,
      dados.ativo ? 1 : 0,
      dados.ordem,
      id,
    );
  return buscarParticipante(id)!;
}

export function excluirParticipante(id: string): void {
  const db = banco();
  const temDoacao = db.prepare("SELECT 1 FROM donations WHERE participant_id = ? LIMIT 1").get(id);
  if (temDoacao) db.prepare("UPDATE participants SET active = 0 WHERE id = ?").run(id);
  else db.prepare("DELETE FROM participants WHERE id = ?").run(id);
}

export function listarPremios(eventoId: string, apenasAtivos = false): Premio[] {
  const filtro = apenasAtivos ? " AND active = 1" : "";
  return (
    banco()
      .prepare(`SELECT * FROM prizes WHERE event_id = ?${filtro} ORDER BY sort_order, name`)
      .all(eventoId) as Linha[]
  ).map(mapearPremio);
}

export function buscarPremio(id: string): Premio | null {
  const linha = banco().prepare("SELECT * FROM prizes WHERE id = ?").get(id) as Linha | undefined;
  return linha ? mapearPremio(linha) : null;
}

export function criarPremio(eventoId: string, dados: DadosPremio): Premio {
  const id = randomUUID();
  banco()
    .prepare(`
      INSERT INTO prizes (
        id, event_id, name, detail, image_url, rule_text, minimum_amount, active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      eventoId,
      dados.nome,
      dados.detalhe,
      dados.imagem,
      dados.regra,
      dados.valorMinimo,
      dados.ativo ? 1 : 0,
      dados.ordem,
    );
  return buscarPremio(id)!;
}

export function atualizarPremio(id: string, dados: DadosPremio): Premio {
  banco()
    .prepare(`
      UPDATE prizes SET
        name = ?, detail = ?, image_url = ?, rule_text = ?, minimum_amount = ?, active = ?, sort_order = ?
      WHERE id = ?
    `)
    .run(
      dados.nome,
      dados.detalhe,
      dados.imagem,
      dados.regra,
      dados.valorMinimo,
      dados.ativo ? 1 : 0,
      dados.ordem,
      id,
    );
  return buscarPremio(id)!;
}

export function excluirPremio(id: string): void {
  banco().prepare("DELETE FROM prizes WHERE id = ?").run(id);
}

export function listarCampos(eventoId: string, apenasAtivos = false): CampoFormulario[] {
  const filtro = apenasAtivos ? " AND active = 1" : "";
  return (
    banco()
      .prepare(`SELECT * FROM form_fields WHERE event_id = ?${filtro} ORDER BY sort_order, label`)
      .all(eventoId) as Linha[]
  ).map(mapearCampo);
}

export function buscarCampo(id: string): CampoFormulario | null {
  const linha = banco().prepare("SELECT * FROM form_fields WHERE id = ?").get(id) as
    | Linha
    | undefined;
  return linha ? mapearCampo(linha) : null;
}

export function criarCampo(eventoId: string, dados: DadosCampo): CampoFormulario {
  const id = randomUUID();
  banco()
    .prepare(`
      INSERT INTO form_fields (
        id, event_id, field_key, label, field_type, required, placeholder,
        options_json, active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      eventoId,
      dados.chave,
      dados.rotulo,
      dados.tipo,
      dados.obrigatorio ? 1 : 0,
      dados.placeholder,
      JSON.stringify(dados.opcoes),
      dados.ativo ? 1 : 0,
      dados.ordem,
    );
  return buscarCampo(id)!;
}

export function atualizarCampo(id: string, dados: DadosCampo): CampoFormulario {
  banco()
    .prepare(`
      UPDATE form_fields SET
        field_key = ?, label = ?, field_type = ?, required = ?, placeholder = ?,
        options_json = ?, active = ?, sort_order = ?
      WHERE id = ?
    `)
    .run(
      dados.chave,
      dados.rotulo,
      dados.tipo,
      dados.obrigatorio ? 1 : 0,
      dados.placeholder,
      JSON.stringify(dados.opcoes),
      dados.ativo ? 1 : 0,
      dados.ordem,
      id,
    );
  return buscarCampo(id)!;
}

export function excluirCampo(id: string): void {
  banco().prepare("DELETE FROM form_fields WHERE id = ?").run(id);
}

export function criarDoacao(dados: {
  eventoId: string;
  participanteId: string | null;
  nome: string;
  valor: number;
  pesoKg: number;
  respostas: Record<string, string | boolean>;
}): Doacao {
  const id = randomUUID();
  banco()
    .prepare(`
      INSERT INTO donations (
        id, event_id, participant_id, donor_name, amount, weight_kg,
        answers_json, created_at, confirmed_at, shared_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
    `)
    .run(
      id,
      dados.eventoId,
      dados.participanteId,
      dados.nome,
      dados.valor,
      dados.pesoKg,
      JSON.stringify(dados.respostas),
      agoraIso(),
    );
  return buscarDoacao(id)!;
}

export function buscarDoacao(id: string): Doacao | null {
  const linha = banco().prepare("SELECT * FROM donations WHERE id = ?").get(id) as
    | Linha
    | undefined;
  return linha ? mapearDoacao(linha) : null;
}

export function confirmarDoacao(id: string): Doacao | null {
  banco()
    .prepare("UPDATE donations SET confirmed_at = COALESCE(confirmed_at, ?) WHERE id = ?")
    .run(agoraIso(), id);
  return buscarDoacao(id);
}

export function registrarCompartilhamento(id: string): Doacao | null {
  banco()
    .prepare("UPDATE donations SET shared_at = COALESCE(shared_at, ?) WHERE id = ?")
    .run(agoraIso(), id);
  return buscarDoacao(id);
}

export function listarDoacoesEvento(eventoId: string): Doacao[] {
  return (
    banco()
      .prepare("SELECT * FROM donations WHERE event_id = ? ORDER BY created_at DESC")
      .all(eventoId) as Linha[]
  ).map(mapearDoacao);
}

export function contarDoacoesEvento(eventoId: string): number {
  const linha = banco()
    .prepare("SELECT COUNT(*) AS total FROM donations WHERE event_id = ? AND confirmed_at IS NOT NULL")
    .get(eventoId) as Linha;
  return numero(linha.total);
}

export function calcularRanking(eventoId?: string): Ranking | null {
  const evento = eventoId ? buscarEventoPorId(eventoId) : buscarEventoDestaque();
  if (!evento) return null;
  const eventoBase = "participantes" in evento ? evento : completarEvento(evento, true);
  const linhas = (
    banco()
      .prepare(`
        SELECT
          p.id, p.name, p.group_name, p.image_url, p.goal_kg,
          COALESCE(SUM(CASE WHEN d.confirmed_at IS NOT NULL THEN d.weight_kg ELSE 0 END), 0) AS weight_kg,
          COALESCE(SUM(CASE WHEN d.confirmed_at IS NOT NULL THEN d.amount ELSE 0 END), 0) AS amount,
          COUNT(CASE WHEN d.confirmed_at IS NOT NULL THEN 1 END) AS donations
        FROM participants p
        LEFT JOIN donations d ON d.participant_id = p.id AND d.event_id = p.event_id
        WHERE p.event_id = ? AND p.active = 1
        GROUP BY p.id
        ORDER BY weight_kg DESC, donations DESC, p.sort_order, p.name
      `)
      .all(eventoBase.id) as Linha[]
  ).map((linha) => {
    const metaKg = linha.goal_kg === null ? eventoBase.metaKg : numero(linha.goal_kg);
    const pesoKg = Math.round(numero(linha.weight_kg) * 100) / 100;
    return {
      participanteId: texto(linha.id),
      nome: texto(linha.name),
      grupo: texto(linha.group_name),
      imagem: texto(linha.image_url),
      metaKg,
      pesoKg,
      percentual: metaKg > 0 ? Math.round((pesoKg / metaKg) * 1000) / 10 : 0,
      bateuMeta: metaKg > 0 && pesoKg >= metaKg,
      reais: Math.round(numero(linha.amount) * 100) / 100,
      doacoes: numero(linha.donations),
    };
  });

  const totais = banco()
    .prepare(`
      SELECT COUNT(*) AS donations, COALESCE(SUM(weight_kg), 0) AS weight_kg,
             COALESCE(SUM(amount), 0) AS amount
      FROM donations WHERE event_id = ? AND confirmed_at IS NOT NULL
    `)
    .get(eventoBase.id) as Linha;

  return {
    evento: {
      id: eventoBase.id,
      slug: eventoBase.slug,
      nome: eventoBase.nome,
      subtitulo: eventoBase.subtitulo,
      participanteSingular: eventoBase.participanteSingular,
      participantePlural: eventoBase.participantePlural,
      logoMarca: eventoBase.logoMarca,
      logoEvento: eventoBase.logoEvento,
      premioCompeticaoTitulo: eventoBase.premioCompeticaoTitulo,
      premioCompeticaoDescricao: eventoBase.premioCompeticaoDescricao,
      corPrimaria: eventoBase.corPrimaria,
      corSecundaria: eventoBase.corSecundaria,
      corDestaque: eventoBase.corDestaque,
      corFundoCartao: eventoBase.corFundoCartao,
    },
    linhas,
    metaKg: eventoBase.metaKg,
    totalKg: Math.round(numero(totais.weight_kg) * 100) / 100,
    totalReais: Math.round(numero(totais.amount) * 100) / 100,
    doacoes: numero(totais.donations),
    participantesNaMeta: linhas.filter((linha) => linha.bateuMeta).length,
    atualizadoEm: agoraIso(),
  };
}
