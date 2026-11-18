-- Emergency functional rollback. Keep orders, request history and atomic manual saves.
-- Apply only to the explicitly selected environment; this is NOT a forward migration.
begin;
update public.settings set catalog_orders_enabled = false where catalog_orders_enabled;

create or replace function public.guard_catalog_activation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.catalog_orders_enabled then
    raise exception 'Las solicitudes del catálogo están temporalmente pausadas.';
  end if;
  return new;
end;
$$;

revoke execute on function public.submit_catalog_request(text,uuid,jsonb,text,text,text,boolean,text) from anon, authenticated;
revoke execute on function public.record_catalog_event(text,uuid,text) from anon, authenticated;
commit;
