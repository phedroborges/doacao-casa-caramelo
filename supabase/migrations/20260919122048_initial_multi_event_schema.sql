create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  constraint admin_users_email_key unique (email),
  constraint admin_users_email_lowercase check (email = lower(email))
);

create table public.events (
  id text primary key,
  slug text not null unique,
  name text not null,
  subtitle text not null default '',
  description text not null default '',
  beneficiary text not null default '',
  status text not null default 'rascunho',
  featured boolean not null default false,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/Sao_Paulo',
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_status_check check (status in ('rascunho', 'publicado', 'encerrado')),
  constraint events_dates_check check (ends_at > starts_at),
  constraint events_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index events_one_featured_idx on public.events (featured) where featured;
create index events_public_listing_idx on public.events (status, featured desc, starts_at desc);

create table public.participants (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  name text not null,
  slug text not null,
  group_name text not null default '',
  image_url text not null default '',
  goal_kg numeric(12,2),
  active boolean not null default true,
  sort_order integer not null default 0,
  constraint participants_event_slug_key unique (event_id, slug),
  constraint participants_event_id_id_key unique (event_id, id),
  constraint participants_goal_check check (goal_kg is null or goal_kg >= 0)
);

create index participants_event_listing_idx
  on public.participants (event_id, active, sort_order, name);

create table public.prizes (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  name text not null,
  detail text not null default '',
  image_url text not null default '',
  rule_text text not null default '',
  minimum_amount numeric(12,2) not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  constraint prizes_minimum_amount_check check (minimum_amount >= 0)
);

create index prizes_event_listing_idx
  on public.prizes (event_id, active, sort_order, name);

create table public.form_fields (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type text not null,
  required boolean not null default false,
  placeholder text not null default '',
  options_json jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  constraint form_fields_event_key_key unique (event_id, field_key),
  constraint form_fields_type_check check (
    field_type in ('texto', 'texto_longo', 'selecao', 'checkbox')
  ),
  constraint form_fields_options_array_check check (jsonb_typeof(options_json) = 'array')
);

create index form_fields_event_listing_idx
  on public.form_fields (event_id, active, sort_order, label);

create table public.donations (
  id uuid primary key,
  event_id text not null references public.events(id) on delete restrict,
  participant_id text,
  donor_name text not null,
  amount numeric(12,2) not null,
  weight_kg numeric(12,2) not null,
  answers_json jsonb not null default '{}'::jsonb,
  claim_token_hash text not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  shared_at timestamptz,
  constraint donations_participant_event_fkey
    foreign key (event_id, participant_id)
    references public.participants(event_id, id)
    on delete restrict,
  constraint donations_amount_check check (amount > 0 and amount <= 99999999.99),
  constraint donations_weight_check check (weight_kg > 0),
  constraint donations_name_check check (char_length(donor_name) between 2 and 60),
  constraint donations_answers_object_check check (jsonb_typeof(answers_json) = 'object'),
  constraint donations_claim_hash_check check (claim_token_hash ~ '^[0-9a-f]{64}$')
);

create index donations_event_confirmed_idx
  on public.donations (event_id, confirmed_at)
  where confirmed_at is not null;
create index donations_participant_confirmed_idx
  on public.donations (participant_id, confirmed_at)
  where confirmed_at is not null;
create index donations_event_created_idx on public.donations (event_id, created_at desc);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.admin_users
      where user_id = (select auth.uid())
    );
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger events_set_updated_at
before update on public.events
for each row execute function private.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.events enable row level security;
alter table public.participants enable row level security;
alter table public.prizes enable row level security;
alter table public.form_fields enable row level security;
alter table public.donations enable row level security;

create policy "admins can read own membership"
on public.admin_users for select
to authenticated
using (user_id = (select auth.uid()));

create policy "public can read visible events"
on public.events for select
to anon, authenticated
using (status <> 'rascunho');

create policy "admins can manage events"
on public.events for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "public can read participants of visible events"
on public.participants for select
to anon, authenticated
using (
  exists (
    select 1 from public.events
    where events.id = participants.event_id
      and events.status <> 'rascunho'
  )
);

create policy "admins can manage participants"
on public.participants for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "public can read prizes of visible events"
on public.prizes for select
to anon, authenticated
using (
  exists (
    select 1 from public.events
    where events.id = prizes.event_id
      and events.status <> 'rascunho'
  )
);

create policy "admins can manage prizes"
on public.prizes for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "public can read fields of visible events"
on public.form_fields for select
to anon, authenticated
using (
  exists (
    select 1 from public.events
    where events.id = form_fields.event_id
      and events.status <> 'rascunho'
  )
);

create policy "admins can manage form fields"
on public.form_fields for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "public can create valid donations"
on public.donations for insert
to anon, authenticated
with check (
  exists (
    select 1 from public.events
    where events.id = donations.event_id
      and events.status = 'publicado'
      and now() between events.starts_at and events.ends_at
  )
  and (
    participant_id is null
    or exists (
      select 1 from public.participants
      where participants.id = donations.participant_id
        and participants.event_id = donations.event_id
        and participants.active
    )
  )
  and confirmed_at is null
  and shared_at is null
);

create policy "admins can read donations"
on public.donations for select
to authenticated
using ((select private.is_admin()));

create policy "admins can update donations"
on public.donations for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

grant usage on schema public to anon, authenticated;
grant select on public.events, public.participants, public.prizes, public.form_fields
  to anon, authenticated;
grant insert on public.donations to anon, authenticated;
grant select, insert, update, delete on
  public.events, public.participants, public.prizes, public.form_fields
  to authenticated;
grant select, update on public.donations to authenticated;
grant select on public.admin_users to authenticated;

create or replace function public.confirm_donation(p_id uuid, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.donations;
begin
  if p_token is null or char_length(p_token) < 32 then
    return null;
  end if;

  update public.donations
  set confirmed_at = coalesce(confirmed_at, now())
  where id = p_id
    and claim_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  returning * into result;

  if result.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'id', result.id,
    'event_id', result.event_id,
    'participant_id', result.participant_id,
    'donor_name', result.donor_name,
    'amount', result.amount,
    'weight_kg', result.weight_kg,
    'answers_json', result.answers_json,
    'created_at', result.created_at,
    'confirmed_at', result.confirmed_at,
    'shared_at', result.shared_at
  );
end;
$$;

create or replace function public.register_donation_share(p_id uuid, p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed boolean;
begin
  if p_token is null or char_length(p_token) < 32 then
    return false;
  end if;

  update public.donations
  set shared_at = coalesce(shared_at, now())
  where id = p_id
    and claim_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  returning true into changed;

  return coalesce(changed, false);
end;
$$;

create or replace function public.get_event_ranking(p_event_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with visible_event as (
    select id
    from public.events
    where id = p_event_id and status <> 'rascunho'
  ), participant_rows as (
    select
      p.id,
      p.name,
      p.group_name,
      p.image_url,
      p.goal_kg,
      p.sort_order,
      coalesce(sum(d.weight_kg) filter (where d.confirmed_at is not null), 0) as weight_kg,
      coalesce(sum(d.amount) filter (where d.confirmed_at is not null), 0) as amount,
      count(d.id) filter (where d.confirmed_at is not null) as donations
    from public.participants p
    join visible_event ve on ve.id = p.event_id
    left join public.donations d
      on d.event_id = p.event_id and d.participant_id = p.id
    where p.active
    group by p.id, p.name, p.group_name, p.image_url, p.goal_kg, p.sort_order
  ), totals as (
    select
      count(d.id) filter (where d.confirmed_at is not null) as donations,
      coalesce(sum(d.weight_kg) filter (where d.confirmed_at is not null), 0) as weight_kg,
      coalesce(sum(d.amount) filter (where d.confirmed_at is not null), 0) as amount
    from visible_event ve
    left join public.donations d on d.event_id = ve.id
  )
  select case when exists (select 1 from visible_event) then jsonb_build_object(
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'group_name', group_name,
        'image_url', image_url,
        'goal_kg', goal_kg,
        'weight_kg', weight_kg,
        'amount', amount,
        'donations', donations
      ) order by weight_kg desc, donations desc, sort_order, name)
      from participant_rows
    ), '[]'::jsonb),
    'donations', totals.donations,
    'weight_kg', totals.weight_kg,
    'amount', totals.amount
  ) else null end
  from totals;
$$;

revoke all on function public.confirm_donation(uuid, text) from public;
revoke all on function public.register_donation_share(uuid, text) from public;
revoke all on function public.get_event_ranking(text) from public;
grant execute on function public.confirm_donation(uuid, text) to anon, authenticated;
grant execute on function public.register_donation_share(uuid, text) to anon, authenticated;
grant execute on function public.get_event_ranking(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-media',
  'event-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "admins can upload event media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'event-media' and (select private.is_admin()));

create policy "admins can update event media"
on storage.objects for update
to authenticated
using (bucket_id = 'event-media' and (select private.is_admin()))
with check (bucket_id = 'event-media' and (select private.is_admin()));

create policy "admins can delete event media"
on storage.objects for delete
to authenticated
using (bucket_id = 'event-media' and (select private.is_admin()));

insert into public.events (
  id, slug, name, subtitle, description, beneficiary, status, featured,
  starts_at, ends_at, timezone, config_json
)
values (
  'evento-laf-16',
  '16-laf',
  '16ª LAF',
  'Desafio Casa Caramelo · LAF Goiás',
  'Ajude os aumigos de Mineiros e leve sua atlética até a meta.',
  'os aumigos de Mineiros',
  'publicado',
  true,
  '2026-09-19T00:00:00-03:00',
  '2026-10-24T21:00:00-03:00',
  'America/Sao_Paulo',
  $config${
    "temParticipantes": true,
    "participanteSingular": "atlética",
    "participantePlural": "atléticas",
    "rotuloNome": "Seu nome",
    "placeholderNome": "Como te chamam?",
    "metaKg": 100,
    "reaisPorKg": 5,
    "valorMinimo": 5,
    "valorSaco": 125,
    "pesoSacoKg": 25,
    "valoresSugeridos": [10, 25, 50, 125],
    "segundosConfirmacao": 12,
    "instagram": "casacaramelo.myn",
    "pixChave": "ea6bb940-294b-4730-9d90-0aa5eb08e0fc",
    "pixNome": "F C LUCIANO  LTDA",
    "pixCidade": "RIO DE JANEIRO",
    "pixCodigoEstatico": "00020126580014br.gov.bcb.pix0136ea6bb940-294b-4730-9d90-0aa5eb08e0fc5204000053039865802BR5917F C LUCIANO  LTDA6014RIO DE JANEIRO62070503***63044A75",
    "pixValorEmbutido": true,
    "compartilhamentoAtivo": true,
    "textoCompartilhamento": "Eu acabei de doar {kg} de ração para {beneficiario} e te convido a doar também.",
    "chamadaCompartilhamento": "Compartilhe e convide mais gente para doar",
    "recompensaCompartilhamentoTitulo": "Compartilhe e ganhe um bombom",
    "recompensaCompartilhamentoDescricao": "Marque a Casa Caramelo e mostre o Story no stand para retirar.",
    "termoDados": "Seus dados serão usados apenas para registrar a doação, organizar o ranking e prestar contas do evento.",
    "logoMarca": "/marca/logo/casa-caramelo-amarelo.png",
    "logoEvento": "/marca/laf-branco.png",
    "corPrimaria": "#FF0197",
    "corSecundaria": "#9100E5",
    "corDestaque": "#FECB00",
    "corFundoCartao": "#FFF4DC",
    "premioCompeticaoTitulo": "Prêmio surpresa",
    "premioCompeticaoDescricao": "A participante campeã leva um prêmio especial.",
    "resultadoPremios": "24 de outubro, às 21h"
  }$config$::jsonb
)
on conflict (id) do nothing;

insert into public.participants
  (id, event_id, name, slug, group_name, image_url, goal_kg, active, sort_order)
values
  ('participante-mercenaria', 'evento-laf-16', 'Mercenária', 'mercenaria', 'Chave A', '/atleticas/mercenaria.png', null, true, 0),
  ('participante-supinada', 'evento-laf-16', 'Supinada', 'supinada', 'Chave A', '/atleticas/supinada.png', null, true, 1),
  ('participante-milionaria', 'evento-laf-16', 'Milionária', 'milionaria', 'Chave A', '/atleticas/milionaria.png', null, true, 2),
  ('participante-metaneira', 'evento-laf-16', 'Metaneira', 'metaneira', 'Chave A', '/atleticas/metaneira.png', null, true, 3),
  ('participante-agrotoxicos', 'evento-laf-16', 'Agrotóxicos', 'agrotoxicos', 'Chave B', '/atleticas/agrotoxicos.png', null, true, 4),
  ('participante-hematose', 'evento-laf-16', 'Hematose', 'hematose', 'Chave B', '/atleticas/hematose.png', null, true, 5),
  ('participante-fulminante', 'evento-laf-16', 'Fulminante', 'fulminante', 'Chave B', '/atleticas/fulminante.png', null, true, 6),
  ('participante-sistematica', 'evento-laf-16', 'Sistemática', 'sistematica', 'Chave B', '/atleticas/sistematica.png', null, true, 7)
on conflict (id) do nothing;

insert into public.prizes
  (id, event_id, name, detail, image_url, rule_text, minimum_amount, active, sort_order)
values
  ('premio-airfryer', 'evento-laf-16', 'Air Fryer', 'Multi MF1300 · 4,4 litros', '/premios/air-fryer.png', 'Qualquer doação concorre', 0, true, 0),
  ('premio-caixa', 'evento-laf-16', 'Caixa de som', 'WAAW by Alok · 180W RMS · à prova d''água', '/premios/caixa-som.png', 'Doações de R$ 50 pra cima', 50, true, 1)
on conflict (id) do nothing;
