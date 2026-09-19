import "server-only";

import { randomUUID } from "node:crypto";
import { criarClienteSupabaseServidor } from "./supabase/server";

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

  const supabase = await criarClienteSupabaseServidor();
  const pasta = prefixo.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const caminho = `${pasta}/${randomUUID()}.${extensao}`;
  const { error } = await supabase.storage.from("event-media").upload(
    caminho,
    Buffer.from(await arquivo.arrayBuffer()),
    { contentType: arquivo.type, cacheControl: "31536000", upsert: false },
  );
  if (error) throw new Error(`Não foi possível enviar a imagem: ${error.message}`);

  return supabase.storage.from("event-media").getPublicUrl(caminho).data.publicUrl;
}
