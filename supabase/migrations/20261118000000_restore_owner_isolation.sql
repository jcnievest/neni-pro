begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Restore the schema's existing owner policies after production RLS drift.
-- Public catalog and tracking reads continue through their restricted RPCs.
alter table public.clients enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.deliveries enable row level security;

commit;
