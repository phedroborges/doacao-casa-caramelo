"use client";

import type { EventoPublico } from "@/lib/modelos";

export function TermoDados({ evento, aoFechar }: { evento: EventoPublico; aoFechar: () => void }) {
  return (
    <div className="dialogo" role="dialog" aria-modal="true" aria-label="Termo de uso de dados">
      <div>
        <h2>Termo de uso de dados</h2>
        <p>{evento.termoDados}</p>
        <p>
          O pagamento acontece diretamente no seu banco, via PIX. O site não recebe nem
          armazena seus dados bancários.
        </p>
        <p>
          Para corrigir ou apagar seus dados, procure a organização responsável pelo evento.
        </p>
        <button type="button" className="botao" onClick={aoFechar} style={{ marginTop: 16 }}>
          Entendi
        </button>
      </div>
    </div>
  );
}
