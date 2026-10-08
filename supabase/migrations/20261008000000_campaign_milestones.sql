-- Apply to staging first. This migration does not change Auth or business tables.
begin;

create table public.campaign_measurement_config (
  singleton boolean primary key default true check (singleton),
  enabled_at timestamptz not null default now()
);
insert into public.campaign_measurement_config default values;

create table public.campaign_milestones (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null check (event_name in ('CompleteRegistration', 'FirstOrderSaved')),
  event_id uuid not null default gen_random_uuid(),
  attribution jsonb not null default '{}'::jsonb,
  claimed_at timestamptz not null default now(),
  primary key (user_id, event_name)
);

alter table public.campaign_measurement_config enable row level security;
alter table public.campaign_milestones enable row level security;
revoke all on public.campaign_measurement_config, public.campaign_milestones from anon, authenticated;

create function public.claim_campaign_milestone(
  p_event text, p_attribution jsonb default '{}'::jsonb, p_order_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user auth.users%rowtype;
  v_enabled timestamptz;
  v_first_order uuid;
  v_first_date timestamptz;
  v_attribution jsonb;
  v_event_id uuid;
begin
  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null or v_user.email_confirmed_at is null then return null; end if;
  select enabled_at into v_enabled from public.campaign_measurement_config where singleton;
  if v_enabled is null then return null; end if;

  if p_event = 'CompleteRegistration' then
    -- Existing accounts (including Google sign-ins) never become new registrations.
    if v_user.created_at < v_enabled then return null; end if;
  elsif p_event = 'FirstOrderSaved' then
    -- A delivery row is the final persistence step in createOrder.
    select o.id, o.created_at into v_first_order, v_first_date
    from public.orders o join public.deliveries d on d.order_id = o.id and d.user_id = o.user_id
    where o.user_id = v_user.id order by o.created_at, o.id limit 1;
    if p_order_id is null or v_first_order is distinct from p_order_id or v_first_date < v_enabled then
      return null;
    end if;
  else
    return null;
  end if;

  select attribution into v_attribution from public.campaign_milestones
  where user_id = v_user.id and event_name = 'CompleteRegistration';
  v_attribution := coalesce(v_attribution, v_user.raw_user_meta_data->'campaign_attribution', p_attribution, '{}'::jsonb);
  if jsonb_typeof(v_attribution) <> 'object' then v_attribution := '{}'::jsonb; end if;
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_attribution
  from jsonb_each_text(v_attribution)
  where (key = 'utm_source' and value in ('facebook', 'instagram', 'whatsapp', 'meta', 'google'))
     or (key = 'utm_medium' and value in ('paid_social', 'social', 'cpc', 'organic', 'email'))
     or (key = 'utm_campaign' and value = 'negocio-con-orden')
     or (key = 'utm_content' and value in ('tia-nenis-video', 'orden-imagen', 'clientes', 'pedidos', 'cobros'));

  insert into public.campaign_milestones (user_id, event_name, attribution)
  values (v_user.id, p_event, v_attribution)
  on conflict (user_id, event_name) do nothing returning event_id into v_event_id;
  if v_event_id is null then return null; end if;
  return jsonb_build_object('event_id', v_event_id, 'attribution', v_attribution);
end;
$$;
revoke all on function public.claim_campaign_milestone(text, jsonb, uuid) from public, anon;
grant execute on function public.claim_campaign_milestone(text, jsonb, uuid) to authenticated;
commit;
