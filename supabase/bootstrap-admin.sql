-- Libera o primeiro acesso ao painel /admin.
--
-- Por que existe: o login usa Supabase Auth (e-mail e senha) e, depois de
-- autenticar, confere se o usuário está em public.admin_users. Criar contas
-- de autenticação é operação privilegiada, então o passo 1 é feito pelo
-- painel do Supabase e este arquivo cuida só da associação.
--
-- ---------------------------------------------------------------------------
-- PASSO 1 — criar a conta (uma vez, no painel do Supabase)
--
--   Authentication > Users > Add user > Create new user
--   E-mail:        o seu e-mail
--   Senha:         uma senha forte
--   Auto Confirm User: LIGADO  (sem isso o login é recusado)
--
-- PASSO 2 — rodar este arquivo no SQL Editor do Supabase, trocando o e-mail.
-- ---------------------------------------------------------------------------

insert into public.admin_users (user_id, email)
select u.id, lower(u.email)
from auth.users u
where lower(u.email) = lower('troque-pelo-seu@email.com')
on conflict (user_id) do nothing;

-- Conferência: tem que voltar uma linha com e_admin = true.
select u.email,
       u.email_confirmed_at is not null as email_confirmado,
       exists (select 1 from public.admin_users a where a.user_id = u.id) as e_admin
from auth.users u
where lower(u.email) = lower('troque-pelo-seu@email.com');

-- ---------------------------------------------------------------------------
-- Para adicionar outros administradores depois, repita o passo 1 para a pessoa
-- e rode o insert acima com o e-mail dela.
--
-- Para remover o acesso de alguém (mantendo a conta de autenticação):
--   delete from public.admin_users where email = lower('fulano@exemplo.com');
-- ---------------------------------------------------------------------------
