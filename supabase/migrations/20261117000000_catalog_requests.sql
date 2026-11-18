begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.settings add column catalog_orders_enabled boolean not null default false;
alter table public.products add column made_to_order boolean not null default false;
alter table public.products add column catalog_visible boolean not null default true;
alter table public.products add constraint products_made_to_order_stock check (not made_to_order or stock is null);
alter table public.orders add column source text not null default 'manual' check (source in ('manual', 'catalog'));

create table public.order_creation_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  payload jsonb not null,
  order_id uuid not null references public.orders(id) on delete cascade,
  primary key (user_id, operation_id)
);
create table public.catalog_order_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  public_token uuid not null unique default gen_random_uuid(),
  folio text not null unique default ('SOL-' || upper(left(replace(gen_random_uuid()::text, '-', ''),12))),
  operation_id uuid not null,
  input_hash text not null,
  buyer_name text not null,
  buyer_phone text not null,
  buyer_notes text not null default '',
  items jsonb not null,
  estimated_total numeric(12,2) not null,
  conditions text not null default '',
  delivery_date date,
  status text not null default 'pending' check (status in ('pending','adjustment_pending','confirmed','rejected','cancelled')),
  version integer not null default 1,
  accepted_version integer not null default 1,
  consent_version text not null,
  consent_at timestamptz not null default now(),
  order_id uuid unique references public.orders(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, operation_id)
);
create index catalog_requests_inbox on public.catalog_order_requests(user_id, status, created_at desc);
create index catalog_requests_phone on public.catalog_order_requests(user_id, buyer_phone, created_at desc);
create table public.catalog_request_audit (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null references public.catalog_order_requests(id) on delete cascade,
  action text not null,
  version integer not null,
  actor text not null check (actor in ('buyer','seller')),
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table public.catalog_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null check (event_name in ('public_catalog_viewed','catalog_product_selected','order_request_started','order_request_submitted','order_request_confirmed','order_request_rejected','order_request_converted')),
  event_key uuid not null,
  created_at timestamptz not null default now(),
  primary key(user_id, event_name, event_key)
);
create index catalog_events_date on public.catalog_events(user_id, created_at);

alter table public.order_creation_keys enable row level security;
alter table public.catalog_order_requests enable row level security;
alter table public.catalog_request_audit enable row level security;
alter table public.catalog_events enable row level security;
revoke all on public.order_creation_keys, public.catalog_order_requests, public.catalog_request_audit, public.catalog_events from public, anon, authenticated;
grant select on public.catalog_order_requests, public.catalog_request_audit, public.catalog_events to authenticated;
create policy requests_owner_read on public.catalog_order_requests for select to authenticated using (user_id = auth.uid());
create policy request_audit_owner_read on public.catalog_request_audit for select to authenticated using (user_id = auth.uid());
create policy catalog_events_owner_read on public.catalog_events for select to authenticated using (user_id = auth.uid());

-- JSON projection tolerates the subscription field aliases already supported by access.js.
-- No subscription rows, statuses, prices or trial duration are modified here.
create function public.catalog_access_allowed(p_user uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare s jsonb; created timestamptz; ending text; trial text; deadline timestamptz;
begin
  select created_at into created from auth.users where id = p_user;
  if created is null or to_regclass('public.subscriptions') is null then return false; end if;
  execute 'select to_jsonb(s) from public.subscriptions s where user_id = $1 limit 1' into s using p_user;
  ending := coalesce(nullif(s->>'expires_at',''), nullif(s->>'current_period_end',''), nullif(s->>'subscription_end',''), nullif(s->>'ends_at',''));
  if lower(coalesce(s->>'status', s->>'subscription_status','')) = any(array['active','paid','subscribed','approved','authorized','activo','activa','pagado','pagada']) then
    if ending is null then return true; end if;
    deadline := case when ending ~ '^\d{4}-\d{2}-\d{2}$' then (ending::date + interval '1 day' - interval '1 microsecond') at time zone 'America/Mexico_City' else ending::timestamptz end;
    if deadline >= now() then return true; end if;
  end if;
  trial := coalesce(nullif(s->>'trial_end',''), nullif(s->>'trial_ends_at',''));
  if trial is null then
    deadline := (((created at time zone 'America/Mexico_City')::date + 8)::timestamp - interval '1 microsecond') at time zone 'America/Mexico_City';
  else
    deadline := case when trial ~ '^\d{4}-\d{2}-\d{2}$' then (trial::date + interval '1 day' - interval '1 microsecond') at time zone 'America/Mexico_City' else trial::timestamptz end;
  end if;
  return deadline >= now();
exception when invalid_datetime_format or datetime_field_overflow then return false;
end;
$$;
revoke all on function public.catalog_access_allowed(uuid) from public, anon, authenticated;

create function public.require_catalog_access(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or not public.catalog_access_allowed(p_user) then
    raise exception 'Tu prueba gratuita terminó. Suscríbete para seguir usando Nenis Pro.' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.require_catalog_access(uuid) from public, anon, authenticated;

create function public.guard_catalog_activation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.catalog_orders_enabled and (tg_op = 'INSERT' or not old.catalog_orders_enabled) then
    perform public.require_catalog_access(new.user_id);
  end if;
  return new;
end;
$$;
revoke all on function public.guard_catalog_activation() from public, anon, authenticated;
create trigger settings_catalog_activation before insert or update on public.settings for each row execute function public.guard_catalog_activation();

-- One persistence/inventory implementation for manual orders and catalog confirmations.
-- Product locks always use ID order. A failed insert rolls back every stock update.
create function public.persist_order_atomic(p_user uuid, p_operation uuid, p_payload jsonb, p_source text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare saved public.order_creation_keys%rowtype; product public.products%rowtype;
  line jsonb; payment jsonb; lines jsonb; plan jsonb; oid uuid; cid uuid; pid uuid;
  q numeric; price numeric; cost numeric; total numeric; advance numeric; paid numeric := 0; plan_total numeric := 0; costs numeric := 0;
  delivery date; state text; idx integer := 0;
begin
  if p_user is null or p_operation is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Pedido inválido.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || p_operation::text, 0));
  select * into saved from public.order_creation_keys where user_id = p_user and operation_id = p_operation;
  if found then
    if saved.payload <> p_payload then raise exception 'El intento ya se guardó con otros datos. Revisa tus pedidos.'; end if;
    return saved.order_id;
  end if;
  lines := p_payload->'items'; plan := coalesce(p_payload->'payment_plan','[]'::jsonb);
  if jsonb_typeof(lines) is distinct from 'array' or jsonb_array_length(lines) not between 1 and 100
    or jsonb_typeof(plan) is distinct from 'array' or jsonb_array_length(plan) > 100 then raise exception 'Revisa los productos del pedido.'; end if;
  if length(trim(coalesce(p_payload->>'client_name',''))) not between 1 and 120
    or length(coalesce(p_payload->>'client_phone','')) > 30 or length(coalesce(p_payload->>'notes','')) > 4000 then raise exception 'Revisa los datos del pedido.'; end if;
  total := (p_payload->>'total')::numeric; advance := coalesce((p_payload->>'advance')::numeric,0);
  if total is null or not (total between 0 and 999999999) or not (advance between 0 and total) then raise exception 'Revisa el total y el anticipo.'; end if;
  total := round(total,2); advance := round(advance,2);
  cid := nullif(p_payload->>'client_id','')::uuid;
  if cid is not null and not exists(select 1 from public.clients where id=cid and user_id=p_user) then raise exception 'Cliente no disponible.'; end if;
  delivery := nullif(p_payload->>'delivery_date','')::date;
  state := coalesce(p_payload->>'status','apartado');
  if state not in ('apartado','pendiente_pago','pagado','entregado','cancelado') then raise exception 'Estado inválido.'; end if;
  for line in select value from jsonb_array_elements(lines) loop
    q := (line->>'quantity')::numeric; price := (line->>'unit_price')::numeric; cost := coalesce((line->>'unit_cost')::numeric,0);
    if q is null or not(q > 0 and q <= 100000) or q <> round(q,2) or price is null or not(price between 0 and 999999999) or not(cost between 0 and 999999999)
      or length(trim(coalesce(line->>'product_name',''))) not between 1 and 250 then raise exception 'Revisa cantidades y precios.'; end if;
    costs := costs + round(q*cost,2);
    pid := nullif(line->>'product_id','')::uuid;
    if pid is not null and not exists(select 1 from public.products where id=pid and user_id=p_user) then raise exception 'Producto no disponible.'; end if;
  end loop;
  for product in select * from public.products where user_id=p_user
    and id in (select nullif(value->>'product_id','')::uuid from jsonb_array_elements(lines)) order by id for update loop
    select sum((value->>'quantity')::numeric) into q from jsonb_array_elements(lines) where (value->>'product_id')::uuid=product.id;
    if product.stock is not null and not product.made_to_order then
      if product.stock < q then raise exception 'No hay suficiente stock de %. Disponible: %. Solicitado: %.',product.name,product.stock,q; end if;
      update public.products set stock=stock-q where id=product.id;
    end if;
  end loop;
  for payment in select value from jsonb_array_elements(plan) loop
    q := (payment->>'amount')::numeric;
    if q is null or not(q > 0 and q <= total) or coalesce(payment->>'status','pendiente') not in ('pendiente','pagado','vencido') then raise exception 'Plan de pagos inválido.'; end if;
    plan_total := plan_total + round(q,2);
    if payment->>'status'='pagado' then paid := paid + round(q,2); end if;
  end loop;
  if plan_total > total-advance+0.01 then raise exception 'El plan supera el saldo pendiente.'; end if;
  insert into public.orders(user_id,client_id,client_name,client_phone,total,advance,balance,total_cost,delivery_date,status,notes,delivered,source)
  values(p_user,cid,trim(p_payload->>'client_name'),p_payload->>'client_phone',total,advance,greatest(total-advance-paid,0),costs,delivery,state,p_payload->>'notes',coalesce((p_payload->>'delivered')::boolean,false),p_source) returning id into oid;
  for line in select value from jsonb_array_elements(lines) loop
    insert into public.order_items(order_id,user_id,product_id,product_name,quantity,unit_price,unit_cost,subtotal)
    values(oid,p_user,nullif(line->>'product_id','')::uuid,line->>'product_name',(line->>'quantity')::numeric,(line->>'unit_price')::numeric,coalesce((line->>'unit_cost')::numeric,0),round((line->>'quantity')::numeric*(line->>'unit_price')::numeric,2));
  end loop;
  for payment in select value from jsonb_array_elements(plan) loop
    insert into public.payments(id,order_id,user_id,amount,due_date,status,paid_date,sort_order)
    values(coalesce(nullif(payment->>'id',''),gen_random_uuid()::text),oid,p_user,(payment->>'amount')::numeric,nullif(payment->>'due_date','')::date,coalesce(payment->>'status','pendiente'),nullif(payment->>'paid_date','')::date,idx);
    idx := idx+1;
  end loop;
  insert into public.deliveries(order_id,user_id,delivery_date,delivered,status)
    values(oid,p_user,delivery,coalesce((p_payload->>'delivered')::boolean,false),state);
  insert into public.order_creation_keys values(p_user,p_operation,p_payload,oid);
  return oid;
end;
$$;
revoke all on function public.persist_order_atomic(uuid,uuid,jsonb,text) from public, anon, authenticated;
create function public.create_order_atomic(p_operation uuid, p_payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_catalog_access(auth.uid());
  return public.persist_order_atomic(auth.uid(),p_operation,p_payload,'manual');
end;
$$;
revoke all on function public.create_order_atomic(uuid,jsonb) from public, anon;
grant execute on function public.create_order_atomic(uuid,jsonb) to authenticated;

-- Narrow public projection replaces direct public table reads (cost/user_id stay private).
create function public.get_public_catalog(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare shop public.settings%rowtype; products jsonb;
begin
  select * into shop from public.settings where catalog_slug=p_slug and catalog_public;
  if not found then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'category',p.category,'price',p.price,'stock',p.stock,
    'photo_url',p.photo_url,'notes',p.notes,'is_offer',p.is_offer,'offer_price',p.offer_price,'offer_expiry',p.offer_expiry,'offer_description',p.offer_description,
    'made_to_order',p.made_to_order,'catalog_visible',p.catalog_visible) order by p.name,p.id),'[]') into products
    from public.products p where p.user_id=shop.user_id and p.catalog_visible;
  return jsonb_build_object('settings',jsonb_build_object('shop_name',shop.shop_name,'shop_description',shop.shop_description,
    'whatsapp_phone',shop.whatsapp_phone,'catalog_slug',shop.catalog_slug,'catalog_wa_message',shop.catalog_wa_message,'catalog_public',true,
    'catalog_orders_enabled',shop.catalog_orders_enabled and public.catalog_access_allowed(shop.user_id)), 'products',products);
end;
$$;
revoke all on function public.get_public_catalog(text) from public;
grant execute on function public.get_public_catalog(text) to anon,authenticated;
drop policy if exists products_public_read on public.products;
drop policy if exists settings_public_read on public.settings;

-- Only IDs/quantities are accepted. Prices, labels and availability come from Postgres.
create function public.quote_catalog_items(p_user uuid,p_items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare product public.products%rowtype; entry jsonb; q numeric; price numeric; result jsonb := '[]'; wanted integer;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'Selecciona entre 1 y 20 productos.'; end if;
  for entry in select value from jsonb_array_elements(p_items) loop
    q := (entry->>'quantity')::numeric;
    if nullif(entry->>'product_id','') is null or q is null or not(q between 1 and 1000) or q <> trunc(q) then raise exception 'Revisa las cantidades seleccionadas.'; end if;
  end loop;
  select count(distinct (value->>'product_id')::uuid) into wanted from jsonb_array_elements(p_items);
  for product in select * from public.products where user_id=p_user and catalog_visible
    and id in(select (value->>'product_id')::uuid from jsonb_array_elements(p_items)) order by id for update loop
    select sum((value->>'quantity')::numeric) into q from jsonb_array_elements(p_items) where (value->>'product_id')::uuid=product.id;
    if q > 1000 then raise exception 'Máximo 1000 unidades por producto.'; end if;
    if product.stock is not null and not product.made_to_order and product.stock < q then
      raise exception 'No hay suficiente stock de %. Disponible: %. Solicitado: %.',product.name,product.stock,q;
    end if;
    price := case when product.is_offer and product.offer_price is not null
      and (product.offer_expiry is null or product.offer_expiry >= (now() at time zone 'America/Mexico_City')::date) then product.offer_price else product.price end;
    if not(price between 0 and 999999999) then raise exception 'Producto no disponible.'; end if;
    result := result || jsonb_build_array(jsonb_build_object('product_id',product.id,'product_name',product.name,'quantity',q,'unit_price',price,'subtotal',round(price*q,2),
      'availability',case when product.made_to_order then 'on_request' when product.stock is null then 'untracked' else 'stock' end));
  end loop;
  if jsonb_array_length(result) <> wanted then raise exception 'Uno de los productos ya no está disponible en el catálogo.'; end if;
  return result;
end;
$$;
revoke all on function public.quote_catalog_items(uuid,jsonb) from public, anon,authenticated;

create function public.record_catalog_event(p_slug text,p_visit uuid,p_event text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  if p_visit is null or p_event not in ('public_catalog_viewed','catalog_product_selected','order_request_started') or p_event is null then return; end if;
  select user_id into uid from public.settings where catalog_slug=p_slug and catalog_public and catalog_orders_enabled;
  if uid is null or not public.catalog_access_allowed(uid) then return; end if;
  perform pg_advisory_xact_lock(hashtextextended('events:'||uid::text,0));
  if (select count(*) from public.catalog_events where user_id=uid and created_at > now()-interval '1 day') >= 10000 then return; end if;
  insert into public.catalog_events(user_id,event_name,event_key) values(uid,p_event,p_visit) on conflict do nothing;
end;
$$;
revoke all on function public.record_catalog_event(text,uuid,text) from public;
grant execute on function public.record_catalog_event(text,uuid,text) to anon,authenticated;

create function public.submit_catalog_request(p_slug text,p_operation uuid,p_items jsonb,p_name text,p_phone text,p_notes text default '',p_consent boolean default false,p_website text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid; phone text; quoted jsonb; total numeric; r public.catalog_order_requests%rowtype; fingerprint text;
begin
  if p_operation is null or p_consent is distinct from true or coalesce(p_website,'') <> '' then raise exception 'Revisa los datos y autoriza el uso de tu contacto.'; end if;
  if octet_length(p_items::text) > 20000 then raise exception 'La selección es demasiado grande.'; end if;
  phone := regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
  if length(phone)=10 then phone := '52'||phone; end if;
  if length(trim(coalesce(p_name,''))) not between 2 and 120 or length(phone) not between 10 and 15 or length(coalesce(p_notes,'')) > 2000 then raise exception 'Revisa tu nombre, WhatsApp y observaciones.'; end if;
  select user_id into uid from public.settings where catalog_slug=p_slug and catalog_public and catalog_orders_enabled;
  if uid is null or not public.catalog_access_allowed(uid) then raise exception 'Esta tienda no está recibiendo solicitudes por ahora.'; end if;
  fingerprint := md5(jsonb_build_object('items',p_items,'name',trim(p_name),'phone',phone,'notes',coalesce(p_notes,''))::text);
  perform pg_advisory_xact_lock(hashtextextended('requests:'||uid::text,0));
  select * into r from public.catalog_order_requests where user_id=uid and operation_id=p_operation;
  if found then
    if r.input_hash <> fingerprint then raise exception 'Este intento ya se envió con otros datos. Revisa tu solicitud.'; end if;
    return jsonb_build_object('folio',r.folio,'token',r.public_token);
  end if;
  if (select count(*) from public.catalog_order_requests where user_id=uid and created_at > now()-interval '1 hour') >= 100
    or (select count(*) from public.catalog_order_requests where user_id=uid and buyer_phone=phone and created_at > now()-interval '1 day') >= 5 then
    raise exception 'Alcanzaste el límite de solicitudes. Contacta al vendedor o intenta más tarde.';
  end if;
  quoted := public.quote_catalog_items(uid,p_items);
  if exists(select 1 from jsonb_array_elements(p_items) i join jsonb_array_elements(quoted) q on i->>'product_id'=q->>'product_id'
    where (i->>'expected_unit_price')::numeric is distinct from (q->>'unit_price')::numeric) then
    raise exception 'El precio cambió. Actualiza el catálogo y revisa tu selección antes de enviarla.';
  end if;
  select sum((value->>'subtotal')::numeric) into total from jsonb_array_elements(quoted);
  insert into public.catalog_order_requests(user_id,operation_id,input_hash,buyer_name,buyer_phone,buyer_notes,items,estimated_total,consent_version)
    values(uid,p_operation,fingerprint,trim(p_name),phone,coalesce(p_notes,''),quoted,total,'catalog-request-v1') returning * into r;
  insert into public.catalog_request_audit(user_id,request_id,action,version,actor,snapshot) values(uid,r.id,'submitted',1,'buyer',jsonb_build_object('items',quoted,'total',total));
  insert into public.catalog_events(user_id,event_name,event_key) values(uid,'order_request_submitted',r.id);
  return jsonb_build_object('folio',r.folio,'token',r.public_token);
end;
$$;
revoke all on function public.submit_catalog_request(text,uuid,jsonb,text,text,text,boolean,text) from public;
grant execute on function public.submit_catalog_request(text,uuid,jsonb,text,text,text,boolean,text) to anon,authenticated;

-- The random operation ID is also a recovery capability after a lost HTTP response.
create function public.get_catalog_request_receipt(p_slug text,p_operation uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('folio',r.folio,'token',r.public_token) from public.catalog_order_requests r
  join public.settings s on s.user_id=r.user_id where s.catalog_slug=p_slug and r.operation_id=p_operation;
$$;
revoke all on function public.get_catalog_request_receipt(text,uuid) from public;
grant execute on function public.get_catalog_request_receipt(text,uuid) to anon,authenticated;

-- Capability links reveal proposal/status, never contact details or internal IDs.
create function public.get_catalog_request(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('folio',r.folio,'status',r.status,'version',r.version,'items',r.items,'estimated_total',r.estimated_total,
    'conditions',r.conditions,'delivery_date',r.delivery_date,'shop_name',s.shop_name,'whatsapp_phone',s.whatsapp_phone,'catalog_slug',s.catalog_slug)
  from public.catalog_order_requests r join public.settings s on s.user_id=r.user_id where r.public_token=p_token;
$$;
revoke all on function public.get_catalog_request(uuid) from public;
grant execute on function public.get_catalog_request(uuid) to anon,authenticated;

create function public.respond_catalog_request(p_token uuid,p_version integer,p_action text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.catalog_order_requests%rowtype;
begin
  select * into r from public.catalog_order_requests where public_token=p_token for update;
  if not found then raise exception 'Solicitud no disponible.'; end if;
  if r.version is distinct from p_version then raise exception 'La propuesta cambió. Actualiza para revisarla.'; end if;
  if p_action='accept' and r.status='pending' and r.accepted_version=r.version then return public.get_catalog_request(p_token); end if;
  if p_action='cancel' and r.status='cancelled' then return public.get_catalog_request(p_token); end if;
  if p_action='accept' and r.status='adjustment_pending' then
    update public.catalog_order_requests set status='pending',accepted_version=version,updated_at=now() where id=r.id;
  elsif p_action='cancel' and r.status in ('pending','adjustment_pending') then
    update public.catalog_order_requests set status='cancelled',updated_at=now() where id=r.id;
  else raise exception 'La solicitud ya cambió de estado.'; end if;
  insert into public.catalog_request_audit(user_id,request_id,action,version,actor) values(r.user_id,r.id,p_action,r.version,'buyer');
  return public.get_catalog_request(p_token);
end;
$$;
revoke all on function public.respond_catalog_request(uuid,integer,text) from public;
grant execute on function public.respond_catalog_request(uuid,integer,text) to anon,authenticated;

create function public.manage_catalog_request(p_id uuid,p_version integer,p_action text,p_items jsonb default null,p_conditions text default null,p_delivery_date date default null,p_client_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.catalog_order_requests%rowtype; quoted jsonb; total numeric; lines jsonb; oid uuid;
begin
  select * into r from public.catalog_order_requests where id=p_id and user_id=auth.uid() for update;
  if not found then raise exception 'Solicitud no disponible.' using errcode='42501'; end if;
  perform public.require_catalog_access(r.user_id);
  if p_action='confirm' and r.status='confirmed' then return jsonb_build_object('order_id',r.order_id,'status','confirmed'); end if;
  if r.version is distinct from p_version then raise exception 'La solicitud cambió. Actualiza para revisarla.'; end if;
  if r.status not in ('pending','adjustment_pending') then raise exception 'Esta solicitud ya está cerrada.'; end if;
  if p_action in ('reject','cancel') then
    update public.catalog_order_requests set status=case when p_action='reject' then 'rejected' else 'cancelled' end,updated_at=now() where id=r.id;
    insert into public.catalog_request_audit(user_id,request_id,action,version,actor) values(r.user_id,r.id,p_action,r.version,'seller');
    if p_action='reject' then insert into public.catalog_events(user_id,event_name,event_key) values(r.user_id,'order_request_rejected',r.id) on conflict do nothing; end if;
    return jsonb_build_object('status',case when p_action='reject' then 'rejected' else 'cancelled' end);
  end if;
  if p_action='adjust' then
    if length(coalesce(p_conditions,'')) > 2000 then raise exception 'Las condiciones son demasiado largas.'; end if;
    quoted := public.quote_catalog_items(r.user_id,p_items);
  elsif p_action='confirm' then
    if r.status <> 'pending' or r.accepted_version <> r.version then raise exception 'El comprador debe aceptar el ajuste antes de confirmar.'; end if;
    quoted := public.quote_catalog_items(r.user_id,r.items);
  else raise exception 'Acción no disponible.'; end if;
  select sum((value->>'subtotal')::numeric) into total from jsonb_array_elements(quoted);
  if p_action='adjust' or quoted <> r.items then
    update public.catalog_order_requests set items=quoted,estimated_total=total,status='adjustment_pending',version=version+1,
      conditions=case when p_action='adjust' then coalesce(p_conditions,'') else conditions end,
      delivery_date=case when p_action='adjust' then p_delivery_date else delivery_date end,updated_at=now() where id=r.id;
    insert into public.catalog_request_audit(user_id,request_id,action,version,actor,snapshot)
      values(r.user_id,r.id,'adjusted',r.version+1,'seller',jsonb_build_object('items',quoted,'total',total,'conditions',case when p_action='adjust' then coalesce(p_conditions,'') else r.conditions end,'delivery_date',case when p_action='adjust' then p_delivery_date else r.delivery_date end));
    return jsonb_build_object('status','adjustment_pending','requires_acceptance',true);
  end if;
  select jsonb_agg(value || jsonb_build_object('unit_cost',coalesce(p.cost,0))) into lines
    from jsonb_array_elements(quoted) join public.products p on p.id=(value->>'product_id')::uuid and p.user_id=r.user_id;
  oid := public.persist_order_atomic(r.user_id,r.id,jsonb_build_object('client_id',p_client_id,'client_name',r.buyer_name,'client_phone',r.buyer_phone,
    'items',lines,'total',total,'advance',0,'delivery_date',r.delivery_date,'status','apartado','notes',concat_ws(E'\n',nullif(r.buyer_notes,''),nullif(r.conditions,''))),'catalog');
  update public.catalog_order_requests set status='confirmed',order_id=oid,updated_at=now() where id=r.id;
  insert into public.catalog_request_audit(user_id,request_id,action,version,actor) values(r.user_id,r.id,'confirmed',r.version,'seller');
  insert into public.catalog_events(user_id,event_name,event_key) values(r.user_id,'order_request_confirmed',r.id),(r.user_id,'order_request_converted',r.id) on conflict do nothing;
  return jsonb_build_object('status','confirmed','order_id',oid);
end;
$$;
revoke all on function public.manage_catalog_request(uuid,integer,text,jsonb,text,date,uuid) from public,anon;
grant execute on function public.manage_catalog_request(uuid,integer,text,jsonb,text,date,uuid) to authenticated;

commit;
