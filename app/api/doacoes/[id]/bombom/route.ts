import { NextResponse } from "next/server";
import { registrarBombom } from "@/lib/db";
import { BOMBONS, type BombomId } from "@/lib/config";

export const dynamic = "force-dynamic";

const IDS_VALIDOS = BOMBONS.map((bombom) => bombom.id) as readonly BombomId[];

export async function POST(requisicao: Request, contexto: { params: Promise<{ id: string }> }) {
  const { id } = await contexto.params;
  const corpo = await requisicao.json().catch(() => null);
  const bombom = corpo?.bombom as BombomId | undefined;

  if (!bombom || !IDS_VALIDOS.includes(bombom)) {
    return NextResponse.json({ erro: "Bombom inválido." }, { status: 400 });
  }

  const doacao = await registrarBombom(id, bombom);
  if (!doacao) {
    return NextResponse.json({ erro: "Doação não encontrada." }, { status: 404 });
  }
  return NextResponse.json(doacao);
}
