-- Acesso ao painel /admin.
--
-- Como funciona: o login usa Supabase Auth (e-mail e senha) e, depois de
-- autenticar, o app exige que o usuário esteja em public.admin_users. Ter
-- conta no Auth não basta — sem a linha aqui, o login é recusado.
--
-- O primeiro administrador já está criado. Este arquivo serve para adicionar
-- ou remover os próximos.
--
-- ---------------------------------------------------------------------------
-- ADICIONAR UM ADMINISTRADOR
--
-- Passo 1 — crie a conta no painel do Supabase:
--     Authentication > Users > Add user > Create new user
--     Auto Confirm User: LIGADO   (sem isso o login é recusado)
--
-- Passo 2 — rode o insert abaixo com o e-mail da pessoa.
-- ---------------------------------------------------------------------------

insert into public.admin_users (user_id, email)
select u.id, lower(u.email)
from auth.users u
where lower(u.email) = lower('troque-pelo-email@exemplo.com')
on conflict (user_id) do nothing;

-- Conferência: precisa voltar uma linha com e_admin = true.
select u.email,
       u.email_confirmed_at is not null as email_confirmado,
       exists (select 1 from public.admin_users a where a.user_id = u.id) as e_admin
from auth.users u
where lower(u.email) = lower('troque-pelo-email@exemplo.com');

-- ---------------------------------------------------------------------------
-- REMOVER O ACESSO (mantendo a conta de autenticação)
--
--   delete from public.admin_users where email = lower('fulano@exemplo.com');
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- SE VOCÊ CRIAR A CONTA POR SQL EM VEZ DO PAINEL
--
-- Inserir direto em auth.users deixa várias colunas de token nulas. O GoTrue
-- lê essas colunas como texto não-nulo, e o login falha com:
--
--     Database error querying schema        (HTTP 500 no /auth/v1/token)
--
-- O banco aceita o NULL, então o problema só aparece na hora de entrar.
-- Conserto:
--
--   update auth.users
--   set confirmation_token         = coalesce(confirmation_token, ''),
--       recovery_token             = coalesce(recovery_token, ''),
--       email_change               = coalesce(email_change, ''),
--       email_change_token_new     = coalesce(email_change_token_new, ''),
--       email_change_token_current = coalesce(email_change_token_current, ''),
--       phone_change               = coalesce(phone_change, ''),
--       phone_change_token         = coalesce(phone_change_token, ''),
--       reauthentication_token     = coalesce(reauthentication_token, '')
--   where lower(email) = lower('fulano@exemplo.com');
--
-- Criar pelo painel evita tudo isso.
-- ---------------------------------------------------------------------------
