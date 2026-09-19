"use client";

import { useEffect, useState, type CSSProperties, type SyntheticEvent } from "react";
import type { LinhaRanking, Ranking } from "@/lib/modelos";
import { Trofeu } from "@/components/Trofeu";

const INTERVALO_ATUALIZACAO = 5000;
/* O telão só corre com o pelotão da frente: com 13 participantes as barras
   viravam um paredão ilegível numa TV. Quem ficou para trás aparece na faixa
   compacta, e a última colocada ganha o card de rebaixamento. */
const LUGARES_EM_DESTAQUE = 5;

const kg = (valor: number) => `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
const reais = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const inicial = (nome: string) => nome.trim().charAt(0).toUpperCase();

/* Escudo de atlética é redondo; marca de patrocinador é uma assinatura
   horizontal, que espremida num círculo vira um fiapo. A proporção do próprio
   arquivo escolhe a moldura — nada de catalogar marca por marca. */
function medirFormato(evento: SyntheticEvent<HTMLImageElement>) {
  const imagem = evento.currentTarget;
  if (imagem.naturalWidth > imagem.naturalHeight * 1.5) imagem.dataset.formato = "largo";
}

/* Tela cheia: o telão vive numa TV, e a barra do navegador come a faixa de
   métricas. O botão some sozinho depois que a apresentação começa — ele é
   para o momento de montar, não para ficar em cena. */
function BotaoTelaCheia() {
  const [cheia, setCheia] = useState(false);
  const [suportado, setSuportado] = useState(false);

  useEffect(() => {
    setSuportado(typeof document !== "undefined" && document.fullscreenEnabled);
    const aoTrocar = () => setCheia(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", aoTrocar);
    return () => document.removeEventListener("fullscreenchange", aoTrocar);
  }, []);

  /* F alterna, como em player de vídeo. Fica fora de campo de texto para não
     atrapalhar quem estiver digitando em outra tela do app. */
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      const alvo = evento.target as HTMLElement | null;
      if (evento.key.toLowerCase() !== "f" || evento.metaKey || evento.ctrlKey || evento.altKey) return;
      if (alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))) return;
      evento.preventDefault();
      alternar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, []);

  async function alternar() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* Navegador pode recusar (permissão, iOS): o placar segue igual. */
    }
  }

  if (!suportado) return null;
  return (
    <button type="button" className="tela-cheia" onClick={alternar} aria-pressed={cheia} title={`${cheia ? "Sair da tela cheia" : "Tela cheia"} (F)`}>
      {cheia ? (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3v4a2 2 0 0 1-2 2H3M15 3v4a2 2 0 0 0 2 2h4M9 21v-4a2 2 0 0 0-2-2H3M15 21v-4a2 2 0 0 1 2-2h4" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9V5a2 2 0 0 1 2-2h4M21 9V5a2 2 0 0 0-2-2h-4M3 15v4a2 2 0 0 0 2 2h4M21 15v4a2 2 0 0 1-2 2h-4" /></svg>
      )}
      <span>{cheia ? "Sair" : "Tela cheia"}</span>
    </button>
  );
}

function Escudo({ linha, className = "escudo" }: { linha: LinhaRanking; className?: string }) {
  if (!linha.imagem) {
    return <span className={`${className} escudo-vazio`} aria-hidden="true">{inicial(linha.nome)}</span>;
  }
  return <img className={className} src={linha.imagem} alt="" onLoad={medirFormato} />;
}

export function RankingEvento({ eventoId }: { eventoId: string }) {
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [offline, setOffline] = useState(false);
  const [dica, setDica] = useState<{ linha: LinhaRanking; x: number; y: number } | null>(null);
  const [endereco, setEndereco] = useState("");
  /* O QR de cada evento é um arquivo em /qr/<slug>.png. Quem não tiver o
     arquivo simplesmente não mostra o bloco — nada de imagem quebrada. */
  const [temQr, setTemQr] = useState(true);

  useEffect(() => setEndereco(`${window.location.host}/evento/${ranking?.evento.slug ?? ""}`), [ranking?.evento.slug]);
  useEffect(() => setTemQr(true), [ranking?.evento.slug]);
  useEffect(() => {
    let ativo = true;
    async function buscar() {
      try {
        const resposta = await fetch(`/api/ranking?evento=${encodeURIComponent(eventoId)}`, { cache: "no-store" });
        if (!resposta.ok) throw new Error("Ranking indisponível");
        const dados = (await resposta.json()) as Ranking;
        if (!ativo) return;
        setRanking(dados);
        setOffline(false);
      } catch {
        if (ativo) setOffline(true);
      }
    }
    buscar();
    const intervalo = setInterval(buscar, INTERVALO_ATUALIZACAO);
    return () => { ativo = false; clearInterval(intervalo); };
  }, [eventoId]);

  if (!ranking) return <div className="telao"><p className="vazio">Carregando o placar...</p></div>;

  const lider = ranking.linhas[0];
  const temDisputa = Boolean(lider && ranking.totalKg > 0);
  const topo = Math.max(1, ...ranking.linhas.flatMap((linha) => [linha.metaKg, linha.pesoKg]));

  const destaque = ranking.linhas.slice(0, LUGARES_EM_DESTAQUE);
  const restante = ranking.linhas.slice(LUGARES_EM_DESTAQUE);
  /* A lanterna é a última da lista. Quando o placar ainda está zerado, meia
     tabela empata na mesma marca — aí o card diz o empate em vez de eleger
     uma culpada no sorteio da ordenação. */
  const lanterna = restante.length > 0 ? restante[restante.length - 1] : null;
  const empatadosNaLanterna = lanterna
    ? ranking.linhas.filter((linha) => linha.pesoKg === lanterna.pesoKg).length
    : 0;
  /* Só dá para apontar uma lanterna quando ela está sozinha lá embaixo. Com
     meia tabela empatada (o placar recém-zerado, por exemplo), quem aparece no
     card seria só a última do desempate — o card então mostra o empate. */
  const lanternaSozinha = empatadosNaLanterna === 1;
  /* A última só sai da listagem quando o card de rebaixamento a nomeia. No
     empate o card não cita ninguém, então ela continua na lista — nenhum
     participante pode sumir do telão. */
  const perseguidores = lanternaSozinha ? restante.slice(0, -1) : restante;

  const estilo = {
    "--rosa": ranking.evento.corPrimaria,
    "--rosa-escuro": ranking.evento.corPrimaria,
    "--roxo": ranking.evento.corSecundaria,
    "--roxo-escuro": ranking.evento.corSecundaria,
    "--amarelo": ranking.evento.corDestaque,
    "--amarelo-escuro": ranking.evento.corDestaque,
    "--cartao": ranking.evento.corFundoCartao,
  } as CSSProperties;

  return (
    <div className="tema-evento telao" style={estilo} onMouseLeave={() => setDica(null)}>
      <header className="telao-topo">
        {ranking.evento.logoMarca && <img src={ranking.evento.logoMarca} alt="Marca organizadora" />}
        <div><h1>{ranking.evento.nome}</h1><p>meta de {ranking.metaKg} kg por {ranking.evento.participanteSingular}{offline && " · reconectando..."}</p></div>
        {ranking.evento.logoEvento && <img className="selo-laf" src={ranking.evento.logoEvento} alt="Evento" />}
        <div className="agora"><strong className="endereco">doe em {endereco}</strong><span>atualiza a cada {INTERVALO_ATUALIZACAO / 1000}s · {new Date(ranking.atualizadoEm).toLocaleTimeString("pt-BR")}</span></div>
        <BotaoTelaCheia />
      </header>

      <section className="topo-jogo">
        <div className="hero-total">
          <div className="hero-total-texto">
            <span>Ração arrecadada</span>
            <strong>{kg(ranking.totalKg)}</strong>
            <small>{ranking.doacoes} {ranking.doacoes === 1 ? "doação" : "doações"} · {ranking.participantesNaMeta} de {ranking.linhas.length} na meta</small>
          </div>
          {temQr && (
            <div className="hero-qr">
              <img src={`/qr/${ranking.evento.slug}.png`} alt={`QR code para doar em ${endereco}`} onError={() => setTemQr(false)} />
              <span>aponte a câmera e doe</span>
            </div>
          )}
        </div>
        {ranking.evento.premioCompeticaoTitulo && (
          <div className="premio">
            <Trofeu className="premio-trofeu" />
            <div className="premio-texto"><h2>{ranking.evento.premioCompeticaoTitulo}</h2><p>{ranking.evento.premioCompeticaoDescricao}</p></div>
            <div className="premio-lider"><span>{temDisputa ? "Ganhando agora" : "Ainda sem líder"}</span><strong>{temDisputa ? lider.nome : "—"}</strong>{temDisputa && <em>{kg(lider.pesoKg)}</em>}</div>
          </div>
        )}
      </section>

      {destaque.length > 0 && (
        <section className="painel painel-corrida">
          <div className="painel-cabeca">
            <h2>{restante.length > 0 ? `Top ${destaque.length} da corrida` : "A corrida até as metas"}</h2>
            <span className="nota">A linha marca a meta de cada {ranking.evento.participanteSingular}. Listrado = excedente.</span>
          </div>
          <ul className="corrida">
            {destaque.map((linha, indice) => {
              const larguraTotal = Math.min(100, (linha.pesoKg / topo) * 100);
              const posicaoMeta = Math.min(100, (linha.metaKg / topo) * 100);
              const larguraAteMeta = Math.min(larguraTotal, posicaoMeta);
              const larguraExcedente = Math.max(0, larguraTotal - posicaoMeta);
              return (
                <li key={linha.participanteId} className="corredor" data-lugar={indice + 1} data-meta={linha.bateuMeta} onMouseMove={(e) => setDica({ linha, x: e.clientX, y: e.clientY })} onMouseLeave={() => setDica(null)}>
                  <span className="lugar">{indice + 1}º</span>
                  <Escudo linha={linha} />
                  <div className="pista">
                    <div className="pista-rotulos"><span className="pista-nome">{linha.nome}{linha.grupo && <span className="chave">{linha.grupo}</span>}{linha.bateuMeta && <span className="selo-meta">🏆 META BATIDA</span>}</span><span className="pista-valor">{kg(linha.pesoKg)} <i>· {linha.percentual}%</i></span></div>
                    <div className="trilho" role="img" aria-label={`${linha.nome}: ${kg(linha.pesoKg)}, ${linha.percentual}% da meta de ${linha.metaKg} kg`}>
                      {linha.pesoKg > 0 && <div className="barra" style={{ width: `${larguraAteMeta}%` }} />}
                      {larguraExcedente > 0 && <div className="barra-excedente" style={{ left: `${posicaoMeta}%`, width: `${larguraExcedente}%` }} />}
                      {posicaoMeta < 100 && <div className="linha-meta" style={{ left: `${posicaoMeta}%` }} />}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {lanterna && (
        <section className="fundo-tabela">
          {perseguidores.length > 0 && (
            <div className="painel pelotao">
              <h3>Demais colocações</h3>
              <ul>
                {perseguidores.map((linha, indice) => (
                  <li key={linha.participanteId} onMouseMove={(e) => setDica({ linha, x: e.clientX, y: e.clientY })} onMouseLeave={() => setDica(null)}>
                    <span className="lugar">{LUGARES_EM_DESTAQUE + indice + 1}º</span>
                    <Escudo linha={linha} className="escudo escudo-mini" />
                    <span className="pelotao-nome">{linha.nome}</span>
                    <span className="pelotao-valor">{kg(linha.pesoKg)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rebaixamento" onMouseMove={(e) => lanternaSozinha && setDica({ linha: lanterna, x: e.clientX, y: e.clientY })} onMouseLeave={() => setDica(null)}>
            <span className="rebaixamento-faixa">⚠ Zona de rebaixamento</span>
            <div className="rebaixamento-corpo">
              {lanternaSozinha && <Escudo linha={lanterna} className="escudo escudo-lanterna" />}
              <div className="rebaixamento-texto">
                {lanternaSozinha ? (
                  <>
                    <strong>{lanterna.nome}</strong>
                    <em>{kg(lanterna.pesoKg)} <i>· {lanterna.percentual}%</i></em>
                    <small>faltam {kg(Math.max(0, lanterna.metaKg - lanterna.pesoKg))} para a meta</small>
                  </>
                ) : (
                  <>
                    <strong>{empatadosNaLanterna} {ranking.evento.participantePlural} empatadas</strong>
                    <em>{kg(lanterna.pesoKg)}</em>
                    <small>a primeira a doar sai daqui</small>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {ranking.linhas.length > 0 && (
        <details className="ver-tabela"><summary>Ver os mesmos dados em tabela</summary><div><table className="tabela-dados"><caption>Doações convertidas em quilos por participante.</caption><thead><tr><th scope="col">#</th><th scope="col">Participante</th><th scope="col">Grupo</th><th scope="col">Total</th><th scope="col">% da meta</th><th scope="col">Via PIX</th><th scope="col">Doações</th></tr></thead><tbody>{ranking.linhas.map((linha, indice) => <tr key={linha.participanteId}><td>{indice + 1}º</td><td>{linha.nome}</td><td>{linha.grupo || "—"}</td><td>{kg(linha.pesoKg)}</td><td>{linha.percentual}%</td><td>{reais(linha.reais)}</td><td>{linha.doacoes}</td></tr>)}</tbody></table></div></details>
      )}

      <section className="metricas">
        <div><span>Doações</span><strong>{ranking.doacoes}</strong></div>
        {ranking.linhas.length > 0 ? (
          <>
            <div><span>{ranking.evento.participantePlural} na meta</span><strong>{ranking.participantesNaMeta}/{ranking.linhas.length}</strong></div>
            <div><span>Média por {ranking.evento.participanteSingular}</span><strong>{kg(ranking.totalKg / ranking.linhas.length)}</strong></div>
          </>
        ) : (
          <div><span>Peso equivalente</span><strong>{kg(ranking.totalKg)}</strong></div>
        )}
        <div><span>Arrecadado em PIX</span><strong>{reais(ranking.totalReais)}</strong></div>
      </section>
      <p className="rodape"><a href={`/evento/${ranking.evento.slug}`}>Fazer uma doação →</a></p>

      {dica && <div className="dica-hover" style={{ left: Math.min(dica.x + 16, (globalThis.innerWidth ?? 1200) - 280), top: dica.y + 16 }}><strong>{dica.linha.nome}</strong><dl><dt>Total</dt><dd>{kg(dica.linha.pesoKg)}</dd><dt>Meta</dt><dd>{kg(dica.linha.metaKg)}</dd><dt>Via PIX</dt><dd>{reais(dica.linha.reais)}</dd><dt>Doações</dt><dd>{dica.linha.doacoes}</dd><dt>Falta</dt><dd>{dica.linha.bateuMeta ? "bateu! 🏆" : kg(dica.linha.metaKg - dica.linha.pesoKg)}</dd></dl></div>}
    </div>
  );
}
