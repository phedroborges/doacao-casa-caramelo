import Link from "next/link";
import { listarEventosPublicos } from "@/lib/db";

export const dynamic = "force-dynamic";

const data = (valor: string, fuso: string) =>
  new Date(valor).toLocaleString("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function EventosPublicos() {
  const eventos = await listarEventosPublicos();
  return (
    <main className="eventos-publicos">
      <div className="eventos-cabeca">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/logo/casa-caramelo-roxo.png" alt="Casa Caramelo" />
        <span className="chapeu">Campanhas</span>
        <h1>Eventos de doação</h1>
        <p>Escolha uma campanha para doar ou acompanhar o resultado.</p>
      </div>
      <section className="eventos-grade">
        {eventos.map((evento) => {
          const aindaNaoComecou = Date.now() < new Date(evento.inicioEm).getTime();
          return (
          <article className="evento-publico-card" key={evento.id} style={{ borderTopColor: evento.corSecundaria }}>
            <div className="evento-publico-logos">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {evento.logoMarca && <img src={evento.logoMarca} alt="" />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {evento.logoEvento && <img src={evento.logoEvento} alt="" />}
            </div>
            <span className="evento-publico-status">
              {evento.aberto ? "Doações abertas" : aindaNaoComecou ? "Em breve" : "Encerrado"}
            </span>
            <h2>{evento.nome}</h2>
            <p>{evento.descricao}</p>
            <strong>
              {evento.aberto ? "Até" : aindaNaoComecou ? "Começa em" : "Encerrado em"}{" "}
              {data(aindaNaoComecou ? evento.inicioEm : evento.fimEm, evento.fusoHorario)}
            </strong>
            <div>
              <Link className="botao" href={`/evento/${evento.slug}`}>{evento.aberto ? "Doar agora" : "Ver evento"}</Link>
              <Link className="botao contorno" href={`/evento/${evento.slug}/ranking`}>Placar</Link>
            </div>
          </article>
          );
        })}
      </section>
      {!eventos.length && <p className="cartao centro">Nenhum evento publicado no momento.</p>}
    </main>
  );
}
