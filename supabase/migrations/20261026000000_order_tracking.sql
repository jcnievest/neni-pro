begin;

-- Assign permanent references to existing and future orders, independently of sharing.
alter table public.orders add column reference_number bigint generated always as identity;
alter table public.orders add constraint orders_reference_number_key unique (reference_number);

create table public.order_tracking_links (
  order_id uuid primary key references public.orders(id) on delete cascade,
  token uuid not null unique default gen_random_uuid()
);
alter table public.order_tracking_links enable row level security;
revoke all on public.order_tracking_links from public, anon, authenticated;

create function public.manage_order_tracking(p_order_id uuid, p_action text default 'get')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_token uuid;
begin
  -- Serialize enabling/revoking a link and enforce ownership on every action.
  perform 1 from public.orders where id = p_order_id and user_id = auth.uid() for update;
  if not found then raise exception 'Order not found' using errcode = '42501'; end if;
  if p_action = 'enable' then
    insert into public.order_tracking_links (order_id) values (p_order_id)
      on conflict (order_id) do nothing;
  elsif p_action = 'disable' then
    delete from public.order_tracking_links where order_id = p_order_id;
  elsif p_action <> 'get' or p_action is null then
    raise exception 'Invalid action';
  end if;
  select token into v_token from public.order_tracking_links where order_id = p_order_id;
  return v_token;
end;
$$;
revoke all on function public.manage_order_tracking(uuid, text) from public, anon;
grant execute on function public.manage_order_tracking(uuid, text) to authenticated;

-- Never expose the order row, items, customer identity, notes, or financial data.
create function public.get_public_order_tracking(p_token uuid)
returns table (reference_number text, status text, delivered boolean, delivery_date date)
language sql stable security definer set search_path = '' as $$
  select o.reference_number::text, o.status::text,
    coalesce(d.delivered, o.delivered, false), coalesce(d.delivery_date, o.delivery_date)
  from public.order_tracking_links l
  join public.orders o on o.id = l.order_id
  left join lateral (
    select delivered, delivery_date from public.deliveries
    where order_id = o.id and user_id = o.user_id limit 1
  ) d on true
  where l.token = p_token;
$$;
revoke all on function public.get_public_order_tracking(uuid) from public;
grant execute on function public.get_public_order_tracking(uuid) to anon, authenticated;

commit;
