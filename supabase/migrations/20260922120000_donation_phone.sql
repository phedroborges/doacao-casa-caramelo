alter table public.donations
  add column if not exists donor_phone text not null default '';

alter table public.donations
  drop constraint if exists donations_phone_check;

alter table public.donations
  add constraint donations_phone_check
  check (donor_phone = '' or donor_phone ~ '^[1-9][0-9]{9,10}$');

-- Eventos já criados passam a pedir telefone (obrigatório) por padrão.
update public.events
set config_json = jsonb_build_object('pedirTelefone', true, 'telefoneObrigatorio', true)
  || config_json;

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
    'donor_phone', result.donor_phone,
    'amount', result.amount,
    'weight_kg', result.weight_kg,
    'answers_json', result.answers_json,
    'created_at', result.created_at,
    'confirmed_at', result.confirmed_at,
    'shared_at', result.shared_at
  );
end;
$$;

revoke all on function public.confirm_donation(uuid, text) from public;
grant execute on function public.confirm_donation(uuid, text) to anon, authenticated;
