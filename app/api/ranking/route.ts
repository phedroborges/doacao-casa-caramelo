import { NextResponse } from "next/server";
import { buscarEventoPorId, buscarEventoPorSlug, calcularRanking } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(requisicao: Request) {
  const referencia = new URL(requisicao.url).searchParams.get("evento");
  const evento = referencia
    ? (await buscarEventoPorId(referencia)) ?? (await buscarEventoPorSlug(referencia))
    : null;
  if (referencia && (!evento || evento.status === "rascunho")) {
    return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });
  }
  const ranking = await calcularRanking(evento?.id);
  return ranking
    ? NextResponse.json(ranking)
    : NextResponse.json({ erro: "Nenhum evento publicado." }, { status: 404 });
}
