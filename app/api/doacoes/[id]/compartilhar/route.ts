import { NextResponse } from "next/server";
import { registrarCompartilhamento } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(_requisicao: Request, contexto: { params: Promise<{ id: string }> }) {
  const { id } = await contexto.params;
  const doacao = registrarCompartilhamento(id);
  return doacao
    ? NextResponse.json({ registrado: true })
    : NextResponse.json({ erro: "Doação não encontrada." }, { status: 404 });
}
