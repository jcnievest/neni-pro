-- Reverse the emergency pause without opting any seller in automatically.
begin;
create or replace function public.guard_catalog_activation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.catalog_orders_enabled and (tg_op = 'INSERT' or not old.catalog_orders_enabled) then
    perform public.require_catalog_access(new.user_id);
  end if;
  return new;
end;
$$;

grant execute on function public.submit_catalog_request(text,uuid,jsonb,text,text,text,boolean,text) to anon, authenticated;
grant execute on function public.record_catalog_event(text,uuid,text) to anon, authenticated;
commit;
