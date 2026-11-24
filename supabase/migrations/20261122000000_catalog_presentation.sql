begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Reuse product-photos and payment_cards.logo_url. No customer rows or columns change.
-- Only the image-decoding server may write this reserved prefix. Other product paths
-- retain their existing owner policies. Restrictive policies also cover UPDATE moves.
create policy catalog_logos_server_insert on storage.objects as restrictive for insert to public
  with check (bucket_id <> 'product-photos' or coalesce((string_to_array(name,'/'))[2],'') <> 'catalog-logos');
create policy catalog_logos_server_update on storage.objects as restrictive for update to public
  using (bucket_id <> 'product-photos' or coalesce((string_to_array(name,'/'))[2],'') <> 'catalog-logos')
  with check (bucket_id <> 'product-photos' or coalesce((string_to_array(name,'/'))[2],'') <> 'catalog-logos');
create policy catalog_logos_server_delete on storage.objects as restrictive for delete to public
  using (bucket_id <> 'product-photos' or coalesce((string_to_array(name,'/'))[2],'') <> 'catalog-logos');

create function public.guard_catalog_logo() returns trigger
language plpgsql security definer set search_path = '' as $$
declare object_path text;
begin
  if tg_op='UPDATE' and new.logo_url is not distinct from old.logo_url then return new; end if;
  if new.logo_url is null then return new; end if;
  perform public.require_catalog_access(new.user_id);
  object_path := substring(new.logo_url from '^https?://[^/]+/storage/v1/object/public/product-photos/(.+)$');
  if object_path is null or object_path !~ ('^'||new.user_id::text||'/catalog-logos/[a-f0-9-]{36}\.webp$')
    or not exists (select 1 from storage.objects where bucket_id='product-photos' and name=object_path
      and metadata->>'mimetype'='image/webp' and (metadata->>'size')::bigint between 1 and 524288) then
    raise exception 'Logotipo no válido para este negocio.' using errcode='22023';
  end if;
  return new;
end $$;
revoke all on function public.guard_catalog_logo() from public,anon,authenticated;
create trigger validate_catalog_logo before insert or update of logo_url,user_id on public.payment_cards
  for each row execute function public.guard_catalog_logo();

-- The HTTP handler verifies the JWT; it never accepts a user ID from the browser.
grant execute on function public.catalog_access_allowed(uuid) to service_role;
create function public.save_catalog_presentation(p_user uuid,p_name text,p_description text,p_replace_logo boolean,p_logo_url text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare logo text;
begin
  perform public.require_catalog_access(p_user);
  if p_name is null or p_description is null or length(p_name)>120 or length(p_description)>300 then
    raise exception 'Nombre o descripción no válidos.';
  end if;
  insert into public.settings(user_id,shop_name,shop_description,catalog_slug)
    values(p_user,nullif(btrim(p_name),''),nullif(btrim(p_description),''),'mi-tienda-'||replace(p_user::text,'-',''))
    on conflict(user_id) do update set shop_name=excluded.shop_name,shop_description=excluded.shop_description,
      catalog_slug=coalesce(settings.catalog_slug,excluded.catalog_slug),updated_at=now();
  if p_replace_logo then
    insert into public.payment_cards(user_id,logo_url) values(p_user,p_logo_url)
      on conflict(user_id) do update set logo_url=excluded.logo_url,updated_at=now();
  end if;
  select logo_url into logo from public.payment_cards where user_id=p_user;
  return jsonb_build_object('logo_url',logo);
end $$;
revoke all on function public.save_catalog_presentation(uuid,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.save_catalog_presentation(uuid,text,text,boolean,text) to service_role;

-- Same public projection and prices as before; only the optional image is added.
create or replace function public.get_public_catalog(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare shop public.settings%rowtype; products jsonb; logo text;
begin
  select * into shop from public.settings where catalog_slug=p_slug and catalog_public;
  if not found then return null; end if;
  select logo_url into logo from public.payment_cards where user_id=shop.user_id;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'category',p.category,'price',p.price,'stock',p.stock,
    'photo_url',p.photo_url,'notes',p.notes,'is_offer',p.is_offer,'offer_price',p.offer_price,'offer_expiry',p.offer_expiry,'offer_description',p.offer_description,
    'made_to_order',p.made_to_order,'catalog_visible',p.catalog_visible) order by p.name,p.id),'[]') into products
    from public.products p where p.user_id=shop.user_id and p.catalog_visible;
  return jsonb_build_object('settings',jsonb_build_object('shop_name',shop.shop_name,'shop_description',shop.shop_description,'logo_url',logo,
    'whatsapp_phone',shop.whatsapp_phone,'catalog_slug',shop.catalog_slug,'catalog_wa_message',shop.catalog_wa_message,'catalog_public',true,
    'catalog_orders_enabled',shop.catalog_orders_enabled and public.catalog_access_allowed(shop.user_id)), 'products',products);
end $$;

alter table public.catalog_events drop constraint catalog_events_event_name_check;
alter table public.catalog_events add constraint catalog_events_event_name_check check (event_name in (
  'public_catalog_viewed','catalog_product_selected','order_request_started','order_request_submitted',
  'order_request_confirmed','order_request_rejected','order_request_converted',
  'order_requests_entry_viewed','order_requests_opened','order_request_review_started','catalog_share_clicked',
  'catalog_menu_opened','catalog_logo_uploaded','catalog_preview_opened'
));
create or replace function public.record_seller_catalog_event(p_event text,p_visit uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); allowed text[] := array[
  'order_requests_entry_viewed','order_requests_opened','order_request_review_started','catalog_share_clicked',
  'catalog_menu_opened','catalog_logo_uploaded','catalog_preview_opened'];
begin
  if uid is null or p_visit is null or p_event is null or not(p_event=any(allowed)) then return false; end if;
  if (select count(*) from public.catalog_events where user_id=uid and created_at>now()-interval '1 day'
    and event_name=any(allowed))>=1000 then return false; end if;
  insert into public.catalog_events(user_id,event_name,event_key) values(uid,p_event,p_visit) on conflict do nothing;
  return true;
end $$;
commit;
