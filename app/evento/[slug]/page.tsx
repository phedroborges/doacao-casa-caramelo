import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AplicativoDoacao } from "@/components/AplicativoDoacao";
import { buscarEventoPublicoPorSlug } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const evento = await buscarEventoPublicoPorSlug(slug);
  return evento
    ? { title: `${evento.nome} — Casa Caramelo`, description: evento.descricao }
    : { title: "Evento não encontrado" };
}

export default async function PaginaEvento({ params }: Props) {
  const { slug } = await params;
  const evento = await buscarEventoPublicoPorSlug(slug);
  if (!evento) notFound();
  return <AplicativoDoacao evento={evento} />;
}
