begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Extend the existing first-party allowlist; no new tables or customer payloads.
alter table public.catalog_events drop constraint catalog_events_event_name_check;
alter table public.catalog_events add constraint catalog_events_event_name_check check (event_name in (
  'public_catalog_viewed','catalog_product_selected','order_request_started',
  'order_request_submitted','order_request_confirmed','order_request_rejected','order_request_converted',
  'order_requests_entry_viewed','order_requests_opened','order_request_review_started','catalog_share_clicked'
));

create function public.record_seller_catalog_event(p_event text, p_visit uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null or p_visit is null or p_event is null or p_event not in (
    'order_requests_entry_viewed','order_requests_opened','order_request_review_started','catalog_share_clicked'
  ) then return false; end if;
  if (select count(*) from public.catalog_events where user_id=uid and created_at > now()-interval '1 day'
    and event_name in ('order_requests_entry_viewed','order_requests_opened','order_request_review_started','catalog_share_clicked')) >= 1000 then return false; end if;
  insert into public.catalog_events(user_id,event_name,event_key) values(uid,p_event,p_visit) on conflict do nothing;
  return true;
end $$;
revoke all on function public.record_seller_catalog_event(text,uuid) from public,anon;
grant execute on function public.record_seller_catalog_event(text,uuid) to authenticated;
commit;
