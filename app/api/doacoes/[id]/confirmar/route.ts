import { NextResponse } from "next/server";
import { confirmarDoacao } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(requisicao: Request, contexto: { params: Promise<{ id: string }> }) {
  const { id } = await contexto.params;
  const corpo = await requisicao.json().catch(() => null);
  const token = String(corpo?.token ?? "");
  const doacao = await confirmarDoacao(id, token);
  if (!doacao) {
    return NextResponse.json({ erro: "Doação não encontrada." }, { status: 404 });
  }
  return NextResponse.json(doacao);
}
