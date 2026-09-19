import { redirect } from "next/navigation";
import { adminAutenticado } from "@/lib/auth";
import { entrarAction } from "./actions";

export const dynamic = "force-dynamic";

const MENSAGENS: Record<string, string> = {
  credenciais: "Usuário ou senha incorretos.",
  limite: "Muitas tentativas. Aguarde 15 minutos e tente novamente.",
  configuracao:
    "O painel ainda não foi configurado. Defina ADMIN_PASSWORD e AUTH_SECRET no servidor.",
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
          Usuário
          <input name="usuario" autoComplete="username" required defaultValue="admin" />
        </label>
        <label>
          Senha
          <input name="senha" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit" className="admin-botao primario">
          Entrar
        </button>

        {process.env.NODE_ENV !== "production" && (
          <small className="admin-dica">Ambiente local: usuário admin e senha admin-local.</small>
        )}
      </form>
    </main>
  );
}
