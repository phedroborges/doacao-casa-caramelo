/**
 * Tudo que muda de evento para evento mora aqui.
 * Editar este arquivo é suficiente para rodar uma nova edição.
 */

export const EVENTO = {
  nome: "Desafio Casa Caramelo",
  subtitulo: "LAF Goiás",
  chamada: "Toda a ração arrecadada vai para os aumigos de Mineiros.",
  /**
   * Para quem vai a ração, sem citar o nome da ONG — a campanha fala de
   * ajudar os aumigos que precisam.
   */
  beneficiario: "os aumigos de Mineiros",
  /** Handle sem o @ — usado no botão "seguir" e no card gerado. */
  instagram: "casacaramelo.myn",
};

export const PIX = {
  chave: "ea6bb940-294b-4730-9d90-0aa5eb08e0fc",
  /** Máx. 25 caracteres, sem acento — precisa bater com a conta recebedora. */
  nome: "F C LUCIANO  LTDA",
  /** Máx. 15 caracteres, sem acento. */
  cidade: "RIO DE JANEIRO",
  /**
   * true  → o QR é gerado na hora já com o valor digitado (o doador só confirma no banco).
   * false → mostra sempre o código estático original, e o doador digita o valor no banco.
   *
   * Se algum banco recusar o código gerado no dia do evento, vire para false:
   * o app volta a usar exatamente o mesmo código que já funciona hoje.
   */
  valorEmbutidoNoQr: true,
  /** Código estático original, usado como fallback quando valorEmbutidoNoQr = false. */
  codigoEstatico:
    "00020126580014br.gov.bcb.pix0136ea6bb940-294b-4730-9d90-0aa5eb08e0fc5204000053039865802BR5917F C LUCIANO  LTDA6014RIO DE JANEIRO62070503***63044A75",
};

export const DESAFIO = {
  /** Meta de cada atlética, em quilos. Pode ser ultrapassada. */
  metaKg: 100,
  /** Quantos reais de PIX valem 1 kg de ração. */
  reaisPorKg: 5,
  /** Piso das doações por PIX, em reais. */
  valorMinimo: 5,
  /** Um saco de 25 kg é o principal marco de doação da campanha. */
  valorSacoRacao: 125,
  pesoSacoRacaoKg: 25,
  valoresSugeridos: [10, 25, 50, 125],
  /**
   * Segundos até o botão "Já paguei" ficar ativo na tela de espera.
   * A espera não tem contador visível — só o loading girando — porque ver
   * o número descendo entrega que é simulação.
   */
  segundosParaLiberarBotao: 12,
};

/** Converte uma doação em dinheiro para o peso equivalente em ração. */
export function reaisParaKg(reais: number): number {
  return Math.round((reais / DESAFIO.reaisPorKg) * 100) / 100;
}

/**
 * Os sorteios da campanha. A regra oficial da peça é "a cada R$ 5 OU 1 kg de
 * ração doado você recebe 1 cupom" — como a conversão do app também é
 * R$ 5 = 1 kg, o número de cupons é exatamente o número de quilos.
 */
export const SORTEIOS = {
  /** Data e forma da apuração, como está na arte da campanha. */
  resultado: "24 de outubro, às 12h",
  apuracao: "apuração física na loja",
  /** Doações a partir deste peso também concorrem à caixa de som.
   *  R$ 50 ÷ R$ 5 por kg = 10 kg, então o mesmo corte serve para
   *  quem doa dinheiro e para quem entrega ração. */
  pesoMinimoCaixaKg: 10,
  itens: [
    {
      id: "airfryer",
      nome: "Air Fryer",
      detalhe: "Multi MF1300 · 3 litros",
      imagem: "/premios/air-fryer.png",
      regra: "Qualquer doação concorre",
      todos: true,
    },
    {
      id: "caixa",
      nome: "Caixa de som",
      detalhe: "WAAW by Alok · 180W RMS · à prova d'água",
      imagem: "/premios/caixa-som.png",
      regra: "Doações de R$ 50 pra cima",
      todos: false,
    },
  ],
} as const;

/** Se a doação também entra no sorteio da caixa de som. */
export function concorreACaixa(pesoKg: number): boolean {
  return pesoKg >= SORTEIOS.pesoMinimoCaixaKg;
}

/** Quanto falta, em reais, para a doação alcançar a caixa de som. */
export function faltaParaCaixaEmReais(pesoKg: number): number {
  return Math.max(0, (SORTEIOS.pesoMinimoCaixaKg - pesoKg) * DESAFIO.reaisPorKg);
}

/** O valor em reais que coloca a doação no sorteio da caixa de som. */
export const VALOR_PARA_CAIXA = SORTEIOS.pesoMinimoCaixaKg * DESAFIO.reaisPorKg;

/**
 * O prêmio da campeã é surpresa de propósito — o suspense faz parte do jogo.
 * Quando for revelado, troque `revelado` para true e preencha o nome.
 */
export const PREMIO = {
  titulo: "Prêmio surpresa",
  chamada: "A atlética campeã leva um prêmio que ninguém viu ainda.",
  revelado: false,
  nome: "",
};

/**
 * O bombom é um prêmio só, com três passos óbvios. Antes eram dois bombons
 * separados (seguir e compartilhar) e confundia mais do que incentivava.
 */
export const BOMBOM = {
  titulo: "Compartilhe e ganhe um bombom",
  chamada: "Ainda não acabou — tem mais prêmio!",
  passos: [
    "Compartilhe o card nos seus stories",
    `Marque @${EVENTO.instagram} no story`,
    "Siga a Casa Caramelo no Instagram",
  ],
  /** Tem outros pontos de doação pela quadra, mas o bombom só sai no stand. */
  retirada:
    "Mostre o story no stand da Casa Caramelo para retirar. Só o stand entrega os bombons.",
};

/** Ids gravados no banco, para o balcão conferir depois. */
export const BOMBONS = [
  { id: "compartilhar" },
  { id: "seguir" },
] as const;

export type BombomId = (typeof BOMBONS)[number]["id"];

export type Atletica = {
  /** Identificador estável — é o que vai gravado no banco. */
  id: string;
  nome: string;
  chave: "A" | "B";
  logo: string;
};

/**
 * As oito atléticas da LAF Goiás. A lista é fixa para o ranking não fragmentar
 * ("Mercenária" e "mercenaria" viram duas linhas se for campo livre).
 */
export const ATLETICAS: Atletica[] = [
  { id: "mercenaria", nome: "Mercenária", chave: "A", logo: "/atleticas/mercenaria.png" },
  { id: "supinada", nome: "Supinada", chave: "A", logo: "/atleticas/supinada.png" },
  { id: "milionaria", nome: "Milionária", chave: "A", logo: "/atleticas/milionaria.png" },
  { id: "metaneira", nome: "Metaneira", chave: "A", logo: "/atleticas/metaneira.png" },
  { id: "agrotoxicos", nome: "Agrotóxicos", chave: "B", logo: "/atleticas/agrotoxicos.png" },
  { id: "hematose", nome: "Hematose", chave: "B", logo: "/atleticas/hematose.png" },
  { id: "fulminante", nome: "Fulminante", chave: "B", logo: "/atleticas/fulminante.png" },
  { id: "sistematica", nome: "Sistemática", chave: "B", logo: "/atleticas/sistematica.png" },
];

export function acharAtletica(id: string): Atletica | undefined {
  return ATLETICAS.find((atletica) => atletica.id === id);
}
