import { NextResponse } from "next/server";
import { registrarCompartilhamento } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(requisicao: Request, contexto: { params: Promise<{ id: string }> }) {
  const { id } = await contexto.params;
  const corpo = await requisicao.json().catch(() => null);
  const token = String(corpo?.token ?? "");
  const registrado = await registrarCompartilhamento(id, token);
  return registrado
    ? NextResponse.json({ registrado: true })
    : NextResponse.json({ erro: "Doação não encontrada." }, { status: 404 });
}
