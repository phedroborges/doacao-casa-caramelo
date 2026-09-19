/**
 * Valida o gerador de BR Code sem depender do build do Next.
 * Copia lib/*.ts para uma pasta temporária com as extensões explícitas
 * (o resolver do Node exige extensão; o do Next não) e roda as asserções.
 */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = await mkdtemp(join(tmpdir(), "pix-"));
for (const arquivo of ["config.ts", "pix.ts"]) {
  const fonte = await readFile(join(process.cwd(), "lib", arquivo), "utf8");
  await writeFile(join(tmp, arquivo), fonte.replace(/from "\.\/(\w+)"/g, 'from "./$1.ts"'));
}

const { gerarBrCode, brCodeValido, crc16 } = await import(join(tmp, "pix.ts"));
const { PIX } = await import(join(tmp, "config.ts"));

let falhas = 0;
const checa = (nome, condicao) => {
  console.log(`${condicao ? "  ok  " : " FALHA"}  ${nome}`);
  if (!condicao) falhas++;
};

console.log("Código estático original (o que já funciona hoje):");
checa("CRC do código estático confere", brCodeValido(PIX.codigoEstatico));
checa("CRC calculado = 4A75", crc16(PIX.codigoEstatico.slice(0, -4)) === "4A75");

/** Percorre os campos EMV e devolve {id: valor}. */
function camposDe(payload) {
  const campos = {};
  for (let i = 0; i < payload.length; ) {
    const id = payload.slice(i, i + 2);
    const tamanho = Number(payload.slice(i + 2, i + 4));
    campos[id] = payload.slice(i + 4, i + 4 + tamanho);
    i += 4 + tamanho;
  }
  return campos;
}

console.log("\nCódigos gerados com valor embutido:");
for (const valor of [5, 10, 25.5, 100, 1234.56]) {
  const codigo = gerarBrCode(valor);
  const campos = camposDe(codigo);
  checa(`R$ ${valor} — CRC confere`, brCodeValido(codigo));
  checa(`R$ ${valor} — campo 54 = ${valor.toFixed(2)}`, campos["54"] === valor.toFixed(2));
  checa(`R$ ${valor} — chave PIX preservada`, (campos["26"] ?? "").includes(PIX.chave));
  checa(`R$ ${valor} — moeda BRL e país BR`, campos["53"] === "986" && campos["58"] === "BR");
  checa(`R$ ${valor} — recebedor = ${PIX.nome}`, campos["59"] === PIX.nome);
}

const original = camposDe(PIX.codigoEstatico);
const gerado = camposDe(gerarBrCode(50));
console.log("\nGerado x original (tudo igual, exceto o campo 54 de valor):");
for (const id of ["00", "26", "52", "53", "58", "59", "60", "62"]) {
  checa(`campo ${id} idêntico ao original`, original[id] === gerado[id]);
}

console.log(falhas === 0 ? "\n✓ TODOS OS TESTES PASSARAM" : `\n✗ ${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
