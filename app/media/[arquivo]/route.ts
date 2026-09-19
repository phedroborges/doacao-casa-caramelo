import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { DIRETORIO_DADOS } from "@/lib/db";

export const dynamic = "force-dynamic";

const TIPOS: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _requisicao: Request,
  contexto: { params: Promise<{ arquivo: string }> },
) {
  const { arquivo } = await contexto.params;
  if (!/^[a-zA-Z0-9-]+\.(?:jpg|jpeg|png|webp|gif)$/.test(arquivo)) {
    return NextResponse.json({ erro: "Arquivo inválido." }, { status: 400 });
  }
  try {
    const conteudo = await readFile(join(DIRETORIO_DADOS, "uploads", arquivo));
    const extensao = arquivo.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(new Uint8Array(conteudo), {
      headers: {
        "Content-Type": TIPOS[extensao] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ erro: "Imagem não encontrada." }, { status: 404 });
  }
}
