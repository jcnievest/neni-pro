// Optional local PostgreSQL-compatible test runner; never connects to Supabase.
// PGLITE_MODULE=file:///tmp/nenis-campaign-test/node_modules/@electric-sql/pglite/dist/index.js node --test tests/campaign-milestones.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('milestones enforce confirmation, ownership, rollout and atomic deduplication', { skip: !process.env.PGLITE_MODULE }, async () => {
  const { PGlite } = await import(process.env.PGLITE_MODULE);
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create table auth.users (id uuid primary key, email_confirmed_at timestamptz, created_at timestamptz, raw_user_meta_data jsonb);
      create table public.orders (id uuid primary key, user_id uuid, created_at timestamptz);
      create table public.deliveries (order_id uuid, user_id uuid);
    `);
    await db.exec(await readFile(new URL('../supabase/migrations/20261008000000_campaign_milestones.sql', import.meta.url), 'utf8'));
    const newId = '00000000-0000-0000-0000-000000000001';
    const oldId = '00000000-0000-0000-0000-000000000002';
    const googleId = '00000000-0000-0000-0000-000000000003';
    const orderId = '00000000-0000-0000-0000-000000000004';
    const failedId = '00000000-0000-0000-0000-000000000005';
    const claim = async (event = 'CompleteRegistration', attrs = {}, order = null) =>
      (await db.query('select public.claim_campaign_milestone($1, $2, $3) as result', [event, attrs, order])).rows[0].result;
    assert.equal(await claim(), null, 'anonymous session');
    await db.query(`insert into auth.users values ($1, null, now(), $2), ($3, now(), now() - interval '1 year', '{}'), ($4, now(), now(), '{}')`,
      [newId, { campaign_attribution: { utm_source: 'instagram', email: 'private@example.test' } }, oldId, googleId]);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [oldId]);
    assert.equal(await claim(), null, 'existing Google/email login is not a new registration');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [newId]);
    assert.equal(await claim(), null, 'email is not confirmed');
    await db.query('update auth.users set email_confirmed_at = now() where id = $1', [newId]);
    await db.exec('set role authenticated');
    const confirmed = await claim();
    assert.ok(confirmed.event_id);
    assert.deepEqual(confirmed.attribution, { utm_source: 'instagram' }, 'metadata restores attribution on another device without PII');
    assert.equal(await claim(), null, 'second callback/device cannot reclaim');
    await assert.rejects(db.query('select * from public.campaign_milestones'), /permission denied/);
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [googleId]);
    const google = await claim('CompleteRegistration', { utm_campaign: 'negocio-con-orden', name: 'Private' });
    assert.deepEqual(google.attribution, { utm_campaign: 'negocio-con-orden' });
    assert.equal(await claim('FirstOrderSaved', {}, orderId), null, 'no saved order');
    await db.query('insert into public.orders values ($1, $2, now()), ($3, $2, now())', [failedId, googleId, orderId]);
    assert.equal(await claim('FirstOrderSaved', {}, orderId), null, 'partial persistence must not count');
    await db.query('insert into public.deliveries values ($1, $2)', [orderId, googleId]);
    assert.ok((await claim('FirstOrderSaved', {}, orderId)).event_id);
    assert.equal(await claim('FirstOrderSaved', {}, orderId), null);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [newId]);
    assert.equal(await claim('FirstOrderSaved', {}, orderId), null, 'another user cannot claim this order');
    await db.exec('set role anon');
    await assert.rejects(claim(), /permission denied/);
  } finally { await db.close(); }
});
