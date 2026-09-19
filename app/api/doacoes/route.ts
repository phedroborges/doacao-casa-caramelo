import { NextResponse } from "next/server";
import { criarDoacao } from "@/lib/db";
import { gerarBrCode } from "@/lib/pix";
import { acharAtletica, DESAFIO } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function POST(requisicao: Request) {
  const corpo = await requisicao.json().catch(() => null);
  if (!corpo) {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  const nome = String(corpo.nome ?? "").trim();
  const atleticaId = String(corpo.atleticaId ?? "").trim();
  const tipo = String(corpo.tipo ?? "");
  const quantidade = Number(corpo.quantidade);

  if (nome.length < 2 || nome.length > 60) {
    return NextResponse.json({ erro: "Informe seu nome." }, { status: 400 });
  }
  if (!acharAtletica(atleticaId)) {
    return NextResponse.json({ erro: "Escolha uma atlética da lista." }, { status: 400 });
  }
  if (tipo !== "pix") {
    return NextResponse.json({ erro: "As doações pelo site são feitas somente por PIX." }, { status: 400 });
  }
  if (!Number.isFinite(quantidade)) {
    return NextResponse.json({ erro: "Quantidade inválida." }, { status: 400 });
  }

  if (quantidade < DESAFIO.valorMinimo) {
    return NextResponse.json(
      { erro: `O valor mínimo é R$ ${DESAFIO.valorMinimo},00.` },
      { status: 400 },
    );
  }
  if (corpo.aceiteTermo !== true) {
    return NextResponse.json({ erro: "É preciso aceitar o termo de dados." }, { status: 400 });
  }

  const doacao = await criarDoacao({ nome, atleticaId, tipo, quantidade });

  return NextResponse.json(
    { doacao, brCode: gerarBrCode(doacao.valor) },
    { status: 201 },
  );
}
