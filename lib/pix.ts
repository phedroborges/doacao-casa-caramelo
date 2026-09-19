/**
 * Gerador de BR Code (PIX copia e cola) conforme o padrão EMV do Banco Central.
 *
 * O código estático da Casa Caramelo não carrega valor — o doador teria que
 * digitar no banco. Como o payload é só uma string com CRC16 no fim, dá para
 * montar aqui um código com o valor já embutido, sem nenhuma API de banco.
 * A estrutura gerada é idêntica à do código original, mais o campo 54 (valor).
 */

export const PIX_PADRAO = {
  valorEmbutidoNoQr: true,
  codigoEstatico:
    "00020126580014br.gov.bcb.pix0136ea6bb940-294b-4730-9d90-0aa5eb08e0fc5204000053039865802BR5917F C LUCIANO  LTDA6014RIO DE JANEIRO62070503***63044A75",
  chave: "ea6bb940-294b-4730-9d90-0aa5eb08e0fc",
  nome: "F C LUCIANO  LTDA",
  cidade: "RIO DE JANEIRO",
};

export type ConfiguracaoPix = {
  pixValorEmbutido: boolean;
  pixCodigoEstatico: string;
  pixChave: string;
  pixNome: string;
  pixCidade: string;
};

/** Um campo EMV: id + tamanho em 2 dígitos + valor. */
function campo(id: string, valor: string): string {
  return id + String(valor.length).padStart(2, "0") + valor;
}

/** CRC16/CCITT-FALSE, polinômio 0x1021, valor inicial 0xFFFF. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(payload)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Remove acentos e caracteres que o padrão não aceita, e corta no limite. */
function sanitiza(texto: string, limite: number): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, "")
    .toUpperCase()
    .slice(0, limite)
    .trim();
}

export function gerarBrCode(valorEmReais: number, evento?: ConfiguracaoPix): string {
  const config = evento
    ? {
        valorEmbutidoNoQr: evento.pixValorEmbutido,
        codigoEstatico: evento.pixCodigoEstatico,
        chave: evento.pixChave,
        nome: evento.pixNome,
        cidade: evento.pixCidade,
      }
    : PIX_PADRAO;
  if (!config.valorEmbutidoNoQr) return config.codigoEstatico;

  const merchantAccountInfo =
    campo("00", "br.gov.bcb.pix") + campo("01", config.chave);

  const payloadSemCrc =
    campo("00", "01") + // payload format indicator
    campo("26", merchantAccountInfo) +
    campo("52", "0000") + // merchant category code
    campo("53", "986") + // moeda: BRL
    campo("54", valorEmReais.toFixed(2)) +
    campo("58", "BR") +
    campo("59", sanitiza(config.nome, 25)) +
    campo("60", sanitiza(config.cidade, 15)) +
    campo("62", campo("05", "***")) + // txid livre, como no código original
    "6304"; // o CRC entra logo depois, mas o id+tamanho já contam no cálculo

  return payloadSemCrc + crc16(payloadSemCrc);
}

/** Confere se um BR Code tem CRC válido — usado pelos testes. */
export function brCodeValido(codigo: string): boolean {
  if (codigo.length < 8) return false;
  const corpo = codigo.slice(0, -4);
  return crc16(corpo) === codigo.slice(-4).toUpperCase();
}
