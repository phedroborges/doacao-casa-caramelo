import Link from "next/link";
import { contarDoacoesEvento, listarEventosAdmin } from "@/lib/db";
import { criarEventoAction } from "../../actions";

export const dynamic = "force-dynamic";

const data = (valor: string) =>
  new Date(valor).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });

export default function EventosAdmin() {
  const eventos = listarEventosAdmin();
  return (
    <div className="admin-pagina">
      <div className="admin-titulo-linha">
        <div>
          <span className="admin-kicker">Campanhas</span>
          <h1>Eventos de doação</h1>
          <p>Cada evento guarda suas próprias regras, participantes, doações e identidade.</p>
        </div>
      </div>

      <section className="admin-grade-eventos">
        {eventos.map((evento) => {
          const aberto =
            evento.status === "publicado" &&
            Date.now() >= new Date(evento.inicioEm).getTime() &&
            Date.now() <= new Date(evento.fimEm).getTime();
          return (
            <article className="admin-card admin-evento-card" key={evento.id}>
              <div className="admin-evento-cabeca">
                <span className={`admin-status ${evento.status}`}>
                  {aberto ? "recebendo doações" : evento.status}
                </span>
                {evento.destaque && <span className="admin-status destaque">principal</span>}
              </div>
              <h2>{evento.nome}</h2>
              <p>{evento.subtitulo}</p>
              <dl>
                <div><dt>Encerra</dt><dd>{data(evento.fimEm)}</dd></div>
                <div><dt>Doações</dt><dd>{contarDoacoesEvento(evento.id)}</dd></div>
                <div><dt>Endereço</dt><dd>/evento/{evento.slug}</dd></div>
              </dl>
              <div className="admin-acoes">
                <Link className="admin-botao primario" href={`/admin/eventos/${evento.id}`}>
                  Configurar
                </Link>
                <Link className="admin-botao" href={`/evento/${evento.slug}`} target="_blank">
                  Visualizar ↗
                </Link>
              </div>
            </article>
          );
        })}
      </section>

      <section className="admin-card admin-novo-evento">
        <div>
          <span className="admin-kicker">Novo</span>
          <h2>Criar outro evento</h2>
          <p>Ele nasce como rascunho. Depois você configura tudo antes de publicar.</p>
        </div>
        <form action={criarEventoAction} className="admin-form-inline">
          <label>
            Nome do evento
            <input name="nome" required placeholder="Ex.: Corrida Solidária 2027" />
          </label>
          <label>
            Endereço curto
            <input name="slug" placeholder="corrida-solidaria-2027" />
          </label>
          <label>
            Encerramento
            <input name="fimEm" type="datetime-local" required />
          </label>
          <button className="admin-botao primario" type="submit">Criar evento</button>
        </form>
      </section>
    </div>
  );
}
