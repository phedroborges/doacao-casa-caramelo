import { notFound } from "next/navigation";
import { RankingEvento } from "@/components/RankingEvento";
import { buscarEventoPublicoPorSlug } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RankingDoEvento({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const evento = buscarEventoPublicoPorSlug(slug);
  if (!evento) notFound();
  return <RankingEvento eventoId={evento.id} />;
}
