"use client";

export function BotaoExcluir({ rotulo = "Excluir" }: { rotulo?: string }) {
  return (
    <button
      type="submit"
      className="admin-botao perigo"
      onClick={(evento) => {
        if (!window.confirm("Tem certeza? Esta ação não poderá ser desfeita.")) {
          evento.preventDefault();
        }
      }}
    >
      {rotulo}
    </button>
  );
}
