// Disposable PostgreSQL 17, independent connections. No production URL is accepted.
import assert from 'node:assert/strict';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
const { default: EmbeddedPostgres } = await import(process.env.EMBEDDED_POSTGRES_MODULE);
const databaseDir = await mkdtemp(join(tmpdir(), 'nenis-catalog-pg-'));
const cluster = new EmbeddedPostgres({ databaseDir, user: 'postgres', password: randomUUID(),
  port: 54340, persistent: false, postgresFlags: ['-h', '127.0.0.1'], onLog: () => {}, onError: () => {} });
const clients = [];
try {
  await cluster.initialise(); await cluster.start();
  for (let i = 0; i < 3; i++) { const client = cluster.getPgClient(); await client.connect(); clients.push(client); }
  const [admin, a, b] = clients;
  await admin.query(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,created_at timestamptz default now());
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated;`);
  const schema = (await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8'))
    .replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', '').split('-- Storage bucket for product photos')[0];
  await admin.query(schema);
  await admin.query('create table subscriptions(user_id uuid primary key,status text,trial_end timestamptz); grant all on all tables in schema public to authenticated;');
  for (const name of ['20261026000000_order_tracking.sql','20261117000000_catalog_requests.sql','20261118000000_restore_owner_isolation.sql']) {
    await admin.query(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'));
  }
  const owner = randomUUID(), product = randomUUID();
  await admin.query('insert into auth.users(id) values($1)', [owner]);
  await admin.query("insert into subscriptions(user_id,status) values($1,'active')", [owner]);
  await admin.query("insert into settings(user_id,catalog_slug,catalog_orders_enabled) values($1,'concurrency',true)", [owner]);
  await admin.query("insert into products(id,user_id,name,price,stock) values($1,$2,'Prueba ficticia',100,1)", [product, owner]);
  for (const client of [a,b]) {
    await client.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
    await client.query('set role authenticated');
  }
  async function submit() {
    const { rows } = await a.query("select submit_catalog_request('concurrency',$1,$2,'Prueba','5512345678','',true,'') as r", [randomUUID(), JSON.stringify([{ product_id: product, quantity: 1, expected_unit_price: 100 }])]);
    return (await admin.query('select id,version from catalog_order_requests where public_token=$1', [rows[0].r.token])).rows[0];
  }
  const confirm = (client, request) => client.query("select manage_catalog_request($1,$2,'confirm') as r", [request.id, request.version]);
  async function assertBlocked() {
    for (let i = 0; i < 100; i++) {
      const { rows } = await admin.query('select pg_blocking_pids($1) as pids', [b.processID]);
      if (rows[0].pids.includes(a.processID)) return;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.fail('Second connection never waited on the first connection lock');
  }
  const first = await submit(), second = await submit();
  await a.query('begin'); await b.query('begin');
  const saved = (await confirm(a, first)).rows[0].r;
  const racing = confirm(b, second).then(value => ({ value }), error => ({ error }));
  await assertBlocked(); await a.query('commit');
  assert.match((await racing).error.message, /stock/); await b.query('rollback');
  assert.equal((await admin.query('select stock from products where id=$1', [product])).rows[0].stock, '0.00');
  assert.equal((await admin.query('select count(*)::int as n from orders')).rows[0].n, 1);
  assert.equal((await confirm(b, first)).rows[0].r.order_id, saved.order_id);

  // A manual order competes with a catalog request through the same product lock.
  await admin.query('update products set stock=1 where id=$1', [product]);
  const third = await submit();
  await a.query('begin'); await b.query('begin');
  await a.query('select create_order_atomic($1,$2)', [randomUUID(), JSON.stringify({ client_name: 'Manual ficticio', total: 100, items: [{ product_id: product, product_name: 'Prueba ficticia', quantity: 1, unit_price: 100 }] })]);
  const mixed = confirm(b, third).then(value => ({ value }), error => ({ error }));
  await assertBlocked(); await a.query('commit');
  assert.match((await mixed).error.message, /stock/); await b.query('rollback');
  assert.equal((await admin.query('select count(*)::int as n from orders')).rows[0].n, 2);
  assert.equal((await admin.query('select stock from products where id=$1', [product])).rows[0].stock, '0.00');
  console.log(JSON.stringify({ ok: true, postgres: (await admin.query('show server_version')).rows[0].server_version,
    checks: ['independent connections', 'observed row-lock contention', 'last unit: catalog/catalog', 'last unit: manual/catalog', 'confirmation retry: one order'] }));
} finally {
  for (const client of clients) { await client.query('rollback').catch(() => {}); await client.end(); }
  await cluster.stop();
}
