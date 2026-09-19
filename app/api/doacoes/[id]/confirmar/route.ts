import { NextResponse } from "next/server";
import { confirmarDoacao } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(_requisicao: Request, contexto: { params: Promise<{ id: string }> }) {
  const { id } = await contexto.params;
  const doacao = await confirmarDoacao(id);
  if (!doacao) {
    return NextResponse.json({ erro: "Doação não encontrada." }, { status: 404 });
  }
  return NextResponse.json(doacao);
}
