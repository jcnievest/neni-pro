import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

test('restore disabled RLS without losing seller access or public catalog RPC', { skip: !process.env.PGLITE_MODULE }, async () => {
  const { PGlite } = await import(process.env.PGLITE_MODULE);
  const db = new PGlite();
  const tables = ['clients', 'products', 'orders', 'order_items', 'payments', 'deliveries'];
  const owner = randomUUID(), other = randomUUID();
  const role = async (name, uid = '') => {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
    await db.exec(`set role ${name}`);
  };
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,created_at timestamptz default now());
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to anon,authenticated;`);
    const schema = (await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8'))
      .replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', '').split('-- Storage bucket for product photos')[0];
    await db.exec(schema);
    await db.exec('create table subscriptions(user_id uuid primary key,status text,trial_end timestamptz); grant all on all tables in schema public to anon,authenticated;');
    for (const name of ['20261026000000_order_tracking.sql', '20261117000000_catalog_requests.sql']) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'));
    }
    for (const uid of [owner, other]) {
      await db.query('insert into auth.users(id) values($1)', [uid]);
      await db.query("insert into subscriptions(user_id,status) values($1,'active')", [uid]);
      await db.query('insert into settings(user_id,catalog_slug) values($1,$2)', [uid, uid]);
      await db.query("insert into clients(user_id,name) values($1,'Prueba ficticia')", [uid]);
      await db.query("insert into products(user_id,name,price,stock) values($1,'Producto ficticio',100,2)", [uid]);
      const order = (await db.query("insert into orders(user_id,client_name,total) values($1,'Prueba ficticia',100) returning id", [uid])).rows[0].id;
      await db.query("insert into order_items(user_id,order_id,product_name) values($1,$2,'Producto ficticio')", [uid, order]);
      await db.query('insert into payments(id,user_id,order_id,amount) values($1,$2,$3,50)', [randomUUID(), uid, order]);
      await db.query('insert into deliveries(user_id,order_id) values($1,$2)', [uid, order]);
    }
    for (const table of tables) await db.exec(`alter table public.${table} disable row level security`);
    const migration = await readFile(new URL('../supabase/migrations/20261118000000_restore_owner_isolation.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    await db.exec(migration);
    await role('anon');
    for (const table of tables) assert.equal((await db.query(`select id from ${table}`)).rows.length, 0, table);
    const catalog = (await db.query('select get_public_catalog($1) as r', [owner])).rows[0].r;
    assert.equal(catalog.products.length, 1);
    assert.ok(!('cost' in catalog.products[0]));
    await assert.rejects(db.query("insert into products(user_id,name) values($1,'No permitido')", [owner]), /row-level security/);
    for (const uid of [owner, other]) {
      await role('authenticated', uid);
      for (const table of tables) {
        const rows = (await db.query(`select user_id from ${table}`)).rows;
        assert.deepEqual(rows.map(row => row.user_id), [uid], table);
        assert.equal((await db.query(`update ${table} set id=id returning id`)).rows.length, 1, table);
        assert.equal((await db.query(`delete from ${table} where user_id<>$1 returning id`, [uid])).rows.length, 0, table);
        await assert.rejects(db.query(`update ${table} set user_id=$1`, [uid === owner ? other : owner]), /row-level security/);
      }
      const product = (await db.query("insert into products(user_id,name) values($1,'Producto propio') returning id", [uid])).rows[0];
      assert.equal((await db.query('delete from products where id=$1 returning id', [product.id])).rows.length, 1);
    }
    await role('postgres');
    for (const table of tables) assert.equal((await db.query(`select id from ${table}`)).rows.length, 2, table);
  } finally {
    await db.close();
  }
});
