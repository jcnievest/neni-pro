import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';

async function setup({ orders = [], deliveries = [], user = { id: 'a' }, error = null } = {}) {
  const calls = [];
  const supabase = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from(table) {
      const call = { table, filters: [], sorts: [] };
      calls.push(call);
      const query = {
        select(columns) { call.columns = columns; return query; },
        eq(column, value) { call.filters.push([column, value]); return query; },
        order(column, options) { call.sorts.push([column, options]); return query; },
        limit(value) { call.limit = value; return query; },
        async maybeSingle() {
          const rows = orders.filter(order => call.filters.every(([column, value]) => column.startsWith('deliveries.')
            ? deliveries.some(d => d.order_id === order.id && d.user_id === value)
            : order[column] === value));
          rows.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
          return { data: rows.slice(0, call.limit)[0] ?? null, error };
        },
      };
      return query;
    },
  };
  const module = new SourceTextModule(await readFile(new URL('../src/api/entities.js', import.meta.url), 'utf8'));
  await module.link(specifier => {
    if (specifier === '@/lib/supabase') return new SyntheticModule(['supabase'], function () { this.setExport('supabase', supabase); });
    if (specifier === '@/lib/access') return new SyntheticModule(['requireActiveAccess'], function () {
      this.setExport('requireActiveAccess', () => { throw new Error('Must remain a read-only query'); });
    });
    throw new Error(`Unexpected import: ${specifier}`);
  });
  await module.evaluate();
  return { api: module.namespace, calls };
}

test('eligibility reads only the first complete order belonging to the current user', async () => {
  const { api, calls } = await setup({ orders: [
    { id: 'other', user_id: 'b', created_at: '2020-01-01' },
    { id: 'failed', user_id: 'a', created_at: '2020-01-01' },
    { id: 'new', user_id: 'a', created_at: '2026-11-17' },
    { id: 'first', user_id: 'a', created_at: '2026-01-01', status: 'entregado' },
  ], deliveries: [{ order_id: 'other', user_id: 'b' }, { order_id: 'new', user_id: 'a' }, { order_id: 'first', user_id: 'a' }] });
  assert.equal(await api.getFirstCompletedOrderId('a'), 'first');
  assert.deepEqual(calls[0], { table: 'orders', columns: 'id, deliveries!inner(order_id)',
    filters: [['user_id', 'a'], ['deliveries.user_id', 'a']],
    sorts: [['created_at', { ascending: true }], ['id', { ascending: true }]], limit: 1 });
});

test('empty and partially saved orders do not count; a saved order later cancelled remains historical usage', async () => {
  const { api } = await setup({ orders: [{ id: 'partial', user_id: 'a', created_at: '2026-11-17' }] });
  assert.equal(await api.getFirstCompletedOrderId('a'), null);
  const saved = await setup({ orders: [{ id: 'saved', user_id: 'a', created_at: '2026-11-17', status: 'cancelado' }],
    deliveries: [{ order_id: 'saved', user_id: 'a' }] });
  assert.equal(await saved.api.getFirstCompletedOrderId('a'), 'saved');
});

test('unavailable data and switched accounts never get interpreted as a new user', async () => {
  const failed = await setup({ error: new Error('offline') });
  await assert.rejects(failed.api.getFirstCompletedOrderId('a'), /offline/);
  for (const user of [null, { id: 'b' }]) {
    const { api, calls } = await setup({ user });
    await assert.rejects(api.getFirstCompletedOrderId('a'), /Not authenticated/);
    assert.equal(calls.length, 0);
  }
  const { api, calls } = await setup();
  await assert.rejects(api.getFirstCompletedOrderId(null), /Not authenticated/);
  assert.equal(calls.length, 0);
});
