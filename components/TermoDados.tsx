"use client";

import { EVENTO } from "@/lib/config";

export function TermoDados({ aoFechar }: { aoFechar: () => void }) {
  return (
    <div className="dialogo" role="dialog" aria-modal="true" aria-label="Termo de uso de dados">
      <div>
        <h2>Termo de uso de dados</h2>
        <p>
          Ao doar pelo {EVENTO.nome}, você autoriza a Casa Caramelo a registrar{" "}
          <strong>seu nome, a atlética escolhida e o quanto você doou</strong>.
        </p>
        <p>
          Esses dados são usados apenas para montar o placar do desafio entre as atléticas e
          para conferir o total arrecadado. Nome e atlética podem aparecer no telão do ranking e
          no card que você escolher compartilhar.
        </p>
        <p>
          O pagamento acontece direto no seu banco, via PIX. A Casa Caramelo{" "}
          <strong>não recebe nem armazena</strong> nenhum dado bancário seu.
        </p>
        <p>
          Para corrigir ou apagar seus dados, é só falar com a equipe da Casa Caramelo no evento.
        </p>
        <button type="button" className="botao" onClick={aoFechar} style={{ marginTop: 16 }}>
          Entendi
        </button>
      </div>
    </div>
  );
}
