import { redirect } from "next/navigation";
import { adminAutenticado } from "@/lib/auth";
import { entrarAction } from "./actions";

export const dynamic = "force-dynamic";

const MENSAGENS: Record<string, string> = {
  credenciais: "E-mail, senha ou permissão de administrador incorretos.",
  limite: "Muitas tentativas. Aguarde 15 minutos e tente novamente.",
  configuracao:
    "O painel ainda não foi configurado. Defina as variáveis públicas do projeto Supabase no servidor.",
};

export default async function LoginAdmin({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (await adminAutenticado()) redirect("/admin/eventos");
  const { erro } = await searchParams;

  return (
    <main className="admin-login">
      <form action={entrarAction} className="admin-card admin-login-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/logo/casa-caramelo-roxo.png" alt="Casa Caramelo" />
        <div>
          <span className="admin-kicker">Gestão de campanhas</span>
          <h1>Painel administrativo</h1>
          <p>Entre para organizar eventos, participantes, formulários e prêmios.</p>
        </div>

        {erro && <p className="admin-alerta erro">{MENSAGENS[erro] ?? "Não foi possível entrar."}</p>}

        <label>
          E-mail
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Senha
          <input name="senha" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit" className="admin-botao primario">
          Entrar
        </button>

        <small className="admin-dica">Use o usuário autorizado no Supabase Auth.</small>
      </form>
    </main>
  );
}
