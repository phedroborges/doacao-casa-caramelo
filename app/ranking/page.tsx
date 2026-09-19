"use client";

import { useEffect, useState } from "react";
import { EVENTO, PREMIO } from "@/lib/config";
import { Trofeu } from "@/components/Trofeu";

type LinhaRanking = {
  atleticaId: string;
  nome: string;
  chave: "A" | "B";
  logo: string;
  pesoKg: number;
  percentual: number;
  bateuMeta: boolean;
  kgDeRacao: number;
  kgDePix: number;
  reais: number;
  doacoes: number;
};

type Ranking = {
  linhas: LinhaRanking[];
  metaKg: number;
  totalKg: number;
  totalReais: number;
  doacoes: number;
  atleticasNaMeta: number;
  atualizadoEm: string;
};

const INTERVALO_ATUALIZACAO = 5000;

const kg = (valor: number) =>
  `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
const reais = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function PaginaRanking() {
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [offline, setOffline] = useState(false);
  const [dica, setDica] = useState<{ linha: LinhaRanking; x: number; y: number } | null>(null);
  const [endereco, setEndereco] = useState("");

  // Só existe no navegador, e é exatamente o que as pessoas digitam no celular.
  useEffect(() => setEndereco(window.location.host), []);

  useEffect(() => {
    let ativo = true;

    async function buscar() {
      try {
        const resposta = await fetch("/api/ranking", { cache: "no-store" });
        const dados = (await resposta.json()) as Ranking;
        if (!ativo) return;
        setRanking(dados);
        setOffline(false);
      } catch {
        // Wi-Fi do evento oscilando: mantém os números na tela e tenta de novo.
        if (ativo) setOffline(true);
      }
    }

    buscar();
    const intervalo = setInterval(buscar, INTERVALO_ATUALIZACAO);
    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, []);

  if (!ranking) {
    return (
      <div className="telao">
        <p className="vazio">Carregando o placar...</p>
      </div>
    );
  }

  const lider = ranking.linhas[0];
  const temDisputa = ranking.totalKg > 0;

  // A pista vai até a meta, ou até quem já passou dela — assim o excedente
  // continua visível sem espremer quem ainda está subindo.
  const topo = Math.max(ranking.metaKg, ...ranking.linhas.map((linha) => linha.pesoKg));
  const posicaoDaMeta = (ranking.metaKg / topo) * 100;

  return (
    <div className="telao" onMouseLeave={() => setDica(null)}>
      <header className="telao-topo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/logo/casa-caramelo-roxo.png" alt="Casa Caramelo" />
        <div>
          <h1>{EVENTO.nome}</h1>
          <p>
            meta de {ranking.metaKg} kg por atlética
            {offline && " · reconectando..."}
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="selo-laf" src="/marca/laf-branco.png" alt="LAF Goiás" />
        <div className="agora">
          {/* Na TV o rodapé fica escondido, então o endereço para doar vem
              aqui — é o mesmo que está na barra do navegador. */}
          <strong className="endereco">doe em {endereco}</strong>
          <span>
            atualiza a cada {INTERVALO_ATUALIZACAO / 1000}s ·{" "}
            {new Date(ranking.atualizadoEm).toLocaleTimeString("pt-BR")}
          </span>
        </div>
      </header>

      {/* --- 1 e 2: quanto já veio, e o que está em jogo --- */}
      <section className="topo-jogo">
        <div className="hero-total">
          <span>Ração arrecadada</span>
          <strong>{kg(ranking.totalKg)}</strong>
          <small>
            {ranking.doacoes} {ranking.doacoes === 1 ? "doação" : "doações"} ·{" "}
            {ranking.atleticasNaMeta} de {ranking.linhas.length}{" "}
            {ranking.atleticasNaMeta === 1 ? "atlética bateu" : "atléticas bateram"} a meta
          </small>
        </div>

        <div className="premio">
          <Trofeu className="premio-trofeu" />
          <div className="premio-texto">
            <h2>{PREMIO.revelado && PREMIO.nome ? PREMIO.nome : PREMIO.titulo}</h2>
            <p>{PREMIO.chamada}</p>
          </div>
          <div className="premio-lider">
            <span>{temDisputa ? "Ganhando agora" : "Ainda sem líder"}</span>
            <strong>{temDisputa ? lider.nome : "—"}</strong>
            {temDisputa && <em>{kg(lider.pesoKg)}</em>}
          </div>
        </div>
      </section>

      {/* --- 3: a corrida das metas --- */}
      <section className="painel painel-corrida">
        <div className="painel-cabeca">
          <h2>A corrida até {ranking.metaKg} kg</h2>
          <span className="nota">
            A linha marca os {ranking.metaKg} kg. Listrado = o que passou da meta.
          </span>
        </div>

        <ul className="corrida">
          {ranking.linhas.map((linha, indice) => {
            const larguraTotal = Math.min(100, (linha.pesoKg / topo) * 100);
            const larguraAteMeta = Math.min(larguraTotal, posicaoDaMeta);
            const larguraExcedente = Math.max(0, larguraTotal - posicaoDaMeta);

            return (
              <li
                key={linha.atleticaId}
                className="corredor"
                data-lugar={indice + 1}
                data-meta={linha.bateuMeta}
                onMouseMove={(evento) =>
                  setDica({ linha, x: evento.clientX, y: evento.clientY })
                }
                onMouseLeave={() => setDica(null)}
              >
                <span className="lugar">{indice + 1}º</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="escudo" src={linha.logo} alt="" />

                <div className="pista">
                  <div className="pista-rotulos">
                    <span className="pista-nome">
                      {linha.nome}
                      <span className="chave">Chave {linha.chave}</span>
                      {linha.bateuMeta && <span className="selo-meta">🏆 META BATIDA</span>}
                    </span>
                    <span className="pista-valor">
                      {kg(linha.pesoKg)} <i>· {linha.percentual}%</i>
                    </span>
                  </div>

                  <div
                    className="trilho"
                    role="img"
                    aria-label={`${linha.nome}: ${kg(linha.pesoKg)}, ${linha.percentual}% da meta de ${ranking.metaKg} kg`}
                  >
                    <div className="barra" style={{ width: `${larguraAteMeta}%` }} />
                    {larguraExcedente > 0 && (
                      <div
                        className="barra-excedente"
                        style={{ left: `${posicaoDaMeta}%`, width: `${larguraExcedente}%` }}
                      />
                    )}
                    {/* Referência dos 100 kg. Sem rótulo flutuante: o título do
                        painel e a nota já dizem o que a linha marca. */}
                    {posicaoDaMeta < 100 && (
                      <div className="linha-meta" style={{ left: `${posicaoDaMeta}%` }} />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <details className="ver-tabela">
          <summary>Ver os mesmos dados em tabela</summary>
          <div>
            <table className="tabela-dados">
              <caption>Ração por atlética. O PIX entra convertido em quilos.</caption>
              <thead>
                <tr>
                  <th scope="col">Atlética</th>
                  <th scope="col">Chave</th>
                  <th scope="col">Total</th>
                  <th scope="col">% da meta</th>
                  <th scope="col">Ração</th>
                  <th scope="col">Via PIX</th>
                  <th scope="col">Doações</th>
                </tr>
              </thead>
              <tbody>
                {ranking.linhas.map((linha) => (
                  <tr key={linha.atleticaId}>
                    <td>{linha.nome}</td>
                    <td>{linha.chave}</td>
                    <td>{kg(linha.pesoKg)}</td>
                    <td>{linha.percentual}%</td>
                    <td>{kg(linha.kgDeRacao)}</td>
                    <td>
                      {kg(linha.kgDePix)} ({reais(linha.reais)})
                    </td>
                    <td>{linha.doacoes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      {/* --- 4: outras métricas --- */}
      <section className="metricas">
        <div>
          <span>Doações</span>
          <strong>{ranking.doacoes}</strong>
        </div>
        <div>
          <span>Atléticas na meta</span>
          <strong>
            {ranking.atleticasNaMeta}/{ranking.linhas.length}
          </strong>
        </div>
        <div>
          <span>Média por atlética</span>
          <strong>{kg(ranking.totalKg / ranking.linhas.length)}</strong>
        </div>
        <div>
          <span>Arrecadado em PIX</span>
          <strong>{reais(ranking.totalReais)}</strong>
        </div>
      </section>

      <p className="rodape">
        <a href="/">Fazer uma doação →</a>
      </p>

      {dica && (
        <div
          className="dica-hover"
          style={{
            left: Math.min(dica.x + 16, (globalThis.innerWidth ?? 1200) - 280),
            top: dica.y + 16,
          }}
        >
          <strong>{dica.linha.nome}</strong>
          <dl>
            <dt>Total</dt>
            <dd>{kg(dica.linha.pesoKg)}</dd>
            <dt>Ração entregue</dt>
            <dd>{kg(dica.linha.kgDeRacao)}</dd>
            <dt>Via PIX</dt>
            <dd>
              {kg(dica.linha.kgDePix)} ({reais(dica.linha.reais)})
            </dd>
            <dt>Doações</dt>
            <dd>{dica.linha.doacoes}</dd>
            <dt>Falta para a meta</dt>
            <dd>
              {dica.linha.bateuMeta ? "bateu! 🏆" : kg(ranking.metaKg - dica.linha.pesoKg)}
            </dd>
          </dl>
        </div>
      )}
    </div>
  );
}
