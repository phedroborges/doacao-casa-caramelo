import { AplicativoDoacao } from "@/components/AplicativoDoacao";
import { buscarEventoDestaque } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function PaginaInicial() {
  const evento = buscarEventoDestaque();
  if (!evento) {
    return (
      <main className="tela centro">
        <h1 className="titulo">Nenhum evento publicado</h1>
        <p className="subtitulo">A próxima campanha aparecerá aqui em breve.</p>
        <a className="botao" href="/eventos">Ver todos os eventos</a>
      </main>
    );
  }
  return <AplicativoDoacao evento={evento} />;
}
