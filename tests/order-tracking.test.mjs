import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formatOrderReference, isTrackingToken, trackingUrl } from '../src/lib/order-reference.js';

test('references are readable and do not truncate large numbers', () => {
  assert.equal(formatOrderReference(123), 'NP-000123');
  assert.equal(formatOrderReference('1234567'), 'NP-1234567');
  assert.equal(formatOrderReference(undefined), null);
});

test('tracking requires a random UUID, not a sequential reference', () => {
  assert.equal(isTrackingToken('NP-000123'), false);
  const token = '11111111-2222-4333-8444-555555555555';
  assert.equal(trackingUrl(token, 'https://www.nenispro.com'), `https://www.nenispro.com/seguimiento#${token}`);
  assert.throws(() => trackingUrl('123', 'https://www.nenispro.com'));
});

test('database enforces ownership, restricted projection, revocation and live status', { skip: !process.env.PGLITE_MODULE }, async () => {
  const { PGlite } = await import(process.env.PGLITE_MODULE);
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create table public.orders (id uuid primary key, user_id uuid, status text, delivered boolean, delivery_date date, client_name text, total numeric);
      create table public.deliveries (order_id uuid, user_id uuid, delivered boolean, delivery_date date);
      insert into public.orders values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'apartado', false, '2026-11-01', 'Private client', 350);
    `);
    await db.exec(await readFile(new URL('../supabase/migrations/20261026000000_order_tracking.sql', import.meta.url), 'utf8'));
    const id = '00000000-0000-0000-0000-000000000001';
    const owner = '00000000-0000-0000-0000-000000000002';
    const manage = async (action = 'get') => (await db.query('select public.manage_order_tracking($1, $2) as token', [id, action])).rows[0].token;
    const lookup = async (token) => (await db.query('select * from public.get_public_order_tracking($1)', [token])).rows;
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [owner]);
    await db.exec('set role authenticated');
    assert.equal(await manage(), null, 'sharing starts disabled');
    const token = await manage('enable');
    assert.ok(isTrackingToken(token));
    assert.equal(await manage('enable'), token, 'enabling twice preserves the link');
    await assert.rejects(db.query('select * from public.order_tracking_links'), /permission denied/);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    for (const action of ['get', 'enable', 'disable']) await assert.rejects(manage(action), /Order not found/);
    await db.exec('set role anon');
    await assert.rejects(manage('enable'), /permission denied/);
    const result = await lookup(token);
    assert.deepEqual(Object.keys(result[0]).sort(), ['delivered', 'delivery_date', 'reference_number', 'status']);
    assert.equal(result[0].status, 'apartado');
    assert.deepEqual(await lookup('11111111-2222-4333-8444-555555555555'), []);
    await assert.rejects(db.query('select * from public.orders'), /permission denied/);
    await db.exec("reset role; update public.orders set status = 'entregado', delivered = true;");
    assert.equal((await lookup(token))[0].delivered, true);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [owner]);
    await db.exec('set role authenticated');
    assert.equal(await manage('disable'), null);
    assert.deepEqual(await lookup(token), []);
    const replacement = await manage('enable');
    assert.notEqual(replacement, token);
    assert.deepEqual(await lookup(token), []);
    await db.exec('reset role');
    await assert.rejects(db.exec('update public.orders set reference_number = 99'), /DEFAULT/);
    await db.exec(`insert into public.orders (id, user_id) values ('00000000-0000-0000-0000-000000000003', '${owner}')`);
    const refs = (await db.query('select reference_number from public.orders')).rows;
    assert.equal(new Set(refs.map(r => r.reference_number)).size, 2);
    await db.query('delete from public.orders where id = $1', [id]);
    assert.deepEqual(await lookup(replacement), []);
  } finally { await db.close(); }
});
