import { NextResponse } from "next/server";
import { buscarEventoCompletoPorId, buscarParticipante, criarDoacao, eventoEstaAberto } from "@/lib/db";
import { gerarBrCode } from "@/lib/pix";

export const dynamic = "force-dynamic";

export async function POST(requisicao: Request) {
  const corpo = await requisicao.json().catch(() => null);
  if (!corpo) {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  const nome = String(corpo.nome ?? "").trim();
  const eventoId = String(corpo.eventoId ?? "").trim();
  const participanteId = corpo.participanteId ? String(corpo.participanteId).trim() : null;
  const tipo = String(corpo.tipo ?? "");
  const quantidade = Number(corpo.quantidade);
  const respostasRecebidas = corpo.respostas && typeof corpo.respostas === "object" ? corpo.respostas : {};
  const evento = buscarEventoCompletoPorId(eventoId);

  if (!evento || evento.status === "rascunho") {
    return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });
  }
  if (!eventoEstaAberto(evento)) {
    return NextResponse.json({ erro: "Este evento não está recebendo doações." }, { status: 409 });
  }

  if (nome.length < 2 || nome.length > 60) {
    return NextResponse.json({ erro: "Informe seu nome." }, { status: 400 });
  }
  const participante = participanteId ? buscarParticipante(participanteId) : null;
  if (
    evento.temParticipantes &&
    (!participante || participante.eventoId !== evento.id || !participante.ativo)
  ) {
    return NextResponse.json(
      { erro: `Escolha ${evento.participanteSingular} da lista.` },
      { status: 400 },
    );
  }
  if (tipo !== "pix") {
    return NextResponse.json({ erro: "As doações pelo site são feitas somente por PIX." }, { status: 400 });
  }
  if (!Number.isFinite(quantidade) || quantidade > 99_999_999.99) {
    return NextResponse.json({ erro: "Quantidade inválida." }, { status: 400 });
  }

  if (quantidade < evento.valorMinimo) {
    return NextResponse.json(
      { erro: `O valor mínimo é R$ ${evento.valorMinimo.toLocaleString("pt-BR")}.` },
      { status: 400 },
    );
  }
  if (corpo.aceiteTermo !== true) {
    return NextResponse.json({ erro: "É preciso aceitar o termo de dados." }, { status: 400 });
  }

  const respostas: Record<string, string | boolean> = {};
  for (const campo of evento.campos) {
    const resposta = respostasRecebidas[campo.chave];
    const normalizada = campo.tipo === "checkbox" ? resposta === true : String(resposta ?? "").trim().slice(0, 500);
    if (campo.obrigatorio && (campo.tipo === "checkbox" ? normalizada !== true : !normalizada)) {
      return NextResponse.json({ erro: `Preencha o campo “${campo.rotulo}”.` }, { status: 400 });
    }
    if (campo.tipo === "selecao" && normalizada && !campo.opcoes.includes(String(normalizada))) {
      return NextResponse.json({ erro: `Resposta inválida em “${campo.rotulo}”.` }, { status: 400 });
    }
    respostas[campo.chave] = normalizada;
  }

  const valor = Math.round(quantidade * 100) / 100;
  const pesoKg = Math.round((valor / evento.reaisPorKg) * 100) / 100;
  const doacao = criarDoacao({
    eventoId: evento.id,
    participanteId: participante?.id ?? null,
    nome,
    valor,
    pesoKg,
    respostas,
  });

  return NextResponse.json(
    { doacao, brCode: gerarBrCode(doacao.valor, evento) },
    { status: 201 },
  );
}
