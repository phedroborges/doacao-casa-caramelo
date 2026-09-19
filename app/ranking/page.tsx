import { RankingEvento } from "@/components/RankingEvento";
import { buscarEventoDestaque } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RankingPrincipal() {
  const evento = await buscarEventoDestaque();
  return evento ? <RankingEvento eventoId={evento.id} /> : <p>Nenhum evento publicado.</p>;
}
