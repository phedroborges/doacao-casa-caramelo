import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DIRETORIO_DADOS } from "./db";

const TIPOS_PERMITIDOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const LIMITE_BYTES = 5 * 1024 * 1024;

export async function salvarImagem(
  arquivo: FormDataEntryValue | null,
  prefixo: string,
): Promise<string | null> {
  if (!(arquivo instanceof File) || arquivo.size === 0) return null;
  const extensao = TIPOS_PERMITIDOS[arquivo.type];
  if (!extensao) throw new Error("Envie uma imagem JPG, PNG, WebP ou GIF.");
  if (arquivo.size > LIMITE_BYTES) throw new Error("A imagem pode ter no máximo 5 MB.");

  const diretorio = join(DIRETORIO_DADOS, "uploads");
  await mkdir(diretorio, { recursive: true });
  const nome = `${prefixo.replace(/[^a-z0-9-]/gi, "-")}-${randomUUID()}.${extensao}`;
  await writeFile(join(diretorio, nome), Buffer.from(await arquivo.arrayBuffer()), {
    flag: "wx",
  });
  return `/media/${nome}`;
}
