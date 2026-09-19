"use client";

export default function ErroAdmin({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="admin-card admin-erro-pagina">
      <span className="admin-kicker">Não foi possível salvar</span>
      <h1>Revise os dados e tente novamente</h1>
      <p>
        Verifique campos obrigatórios, identificadores duplicados, datas e o tamanho das imagens.
      </p>
      <button type="button" className="admin-botao primario" onClick={reset}>
        Voltar ao formulário
      </button>
    </section>
  );
}
