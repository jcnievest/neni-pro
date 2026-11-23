// Minimal Storage metadata model for disposable PostgreSQL tests, not a Storage replacement.
export const storageSchema = `
  create role service_role bypassrls;
  create schema if not exists storage;
  create table storage.buckets(id text primary key,name text,public boolean);
  create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb,unique(bucket_id,name));
  create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
  alter table storage.objects enable row level security;
  grant usage on schema storage,auth to anon,authenticated,service_role;
  grant all on all tables in schema storage to authenticated,service_role;
  grant select on storage.objects to anon;
`;
