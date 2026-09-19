import { NextResponse } from "next/server";
import { adminAutenticado } from "@/lib/auth";
import { buscarEventoCompletoPorId, listarDoacoesEvento } from "@/lib/db";

export const dynamic = "force-dynamic";

const celula = (valor: unknown) => `"${String(valor ?? "").replace(/"/g, '""')}"`;

export async function GET(_requisicao: Request, contexto: { params: Promise<{ id: string }> }) {
  if (!(await adminAutenticado())) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { id } = await contexto.params;
  const evento = await buscarEventoCompletoPorId(id);
  if (!evento) return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });

  const participantes = new Map(evento.participantes.map((item) => [item.id, item.nome]));
  const doacoes = await listarDoacoesEvento(id);
  const colunas = [
    "id", "nome", "participante", "valor", "pesoKg", "respostas",
    "criadoEm", "confirmadoEm", "compartilhadoEm",
  ];
  const linhas = [
    colunas.join(","),
    ...doacoes.map((doacao) =>
      [
        doacao.id,
        doacao.nome,
        doacao.participanteId ? participantes.get(doacao.participanteId) : "",
        doacao.valor,
        doacao.pesoKg,
        JSON.stringify(doacao.respostas),
        doacao.criadoEm,
        doacao.confirmadoEm,
        doacao.compartilhadoEm,
      ].map(celula).join(","),
    ),
  ];
  return new NextResponse(`﻿${linhas.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="doacoes-${evento.slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
