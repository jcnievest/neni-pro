// Run with: node --experimental-vm-modules --test tests/client-purchases.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';

async function historyApi({ rows = [], related = {}, user = { id: 'owner' }, failure } = {}) {
  const calls = [];
  const supabase = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from(table) {
      const call = { table, filters: [], sorts: [] };
      calls.push(call);
      const query = {
        select(columns, options) { call.options = options; return query; },
        eq(column, value) { call.filters.push([column, value]); return query; },
        in(column, values) { call.ids = values; return query; },
        order(column, options) { call.sorts.push([column, options]); return query; },
        range(start, end) { call.range = [start, end]; return query; },
        then(resolve, reject) {
          let data = table === 'orders'
            ? rows.filter(row => call.filters.every(([key, value]) => row[key] === value))
            : (related[table] || []).filter(row => call.ids.includes(row.order_id));
          const count = data.length;
          if (call.range) data = data.slice(call.range[0], call.range[1] + 1);
          return Promise.resolve({ data, count, error: failure?.[table] || null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const source = await readFile(new URL('../src/api/entities.js', import.meta.url), 'utf8');
  const module = new SourceTextModule(source);
  await module.link((specifier) => {
    if (specifier === '@/lib/supabase') {
      return new SyntheticModule(['supabase'], function () { this.setExport('supabase', supabase); });
    }
    if (specifier === '@/lib/access') {
      return new SyntheticModule(['requireActiveAccess'], function () {
        this.setExport('requireActiveAccess', () => { throw new Error('History must remain read-only'); });
      });
    }
    throw new Error(`Unexpected import: ${specifier}`);
  });
  await module.evaluate();
  return { api: module.namespace, calls };
}

const row = (id, overrides = {}) => ({
  id, user_id: 'owner', client_id: 'client-a', client_name: 'Cliente de prueba',
  reference_number: 123, total: '230', advance: '100', balance: '43.34',
  status: 'apartado', created_at: '2026-10-26T18:00:00Z', ...overrides,
});

test('history filters by owner and client ID, not by matching names', async () => {
  const { api, calls } = await historyApi({ rows: [
    row('order-a'), row('other-client', { client_id: 'client-b' }),
    row('other-owner', { user_id: 'another-owner' }), row('unlinked', { client_id: null }),
  ] });
  const result = await api.getClientOrders('client-a');
  assert.deepEqual(Array.from(result.orders, order => order.id), ['order-a']);
  assert.equal(result.count, 1);
  assert.deepEqual(calls[0].filters, [['user_id', 'owner'], ['client_id', 'client-a']]);
  assert.equal(calls[0].options.count, 'exact');
  assert.deepEqual(calls[0].sorts.map(([column, options]) => [column, options.ascending]), [
    ['created_at', false], ['id', false],
  ]);
});

test('history is paginated and includes older purchases beyond the first page', async () => {
  const { api, calls } = await historyApi({ rows: Array.from({ length: 21 }, (_, i) => row(`order-${i}`)) });
  const first = await api.getClientOrders('client-a');
  const second = await api.getClientOrders('client-a', 1);
  assert.equal(first.orders.length, 20);
  assert.equal(first.count, 21);
  assert.deepEqual(Array.from(second.orders, order => order.id), ['order-20']);
  assert.deepEqual(calls.filter(call => call.table === 'orders').map(call => call.range), [[0, 19], [20, 39]]);
});

test('history includes products, payments, delivery and stored balance without modifying them', async () => {
  const { api, calls } = await historyApi({ rows: [row('order-a')], related: {
    order_items: [{ order_id: 'order-a', product_name: 'Camisa de prueba', quantity: '1', unit_price: '230', subtotal: '230' }],
    payments: [{ order_id: 'order-a', id: 'payment-a', amount: '43.33', status: 'pagado' }],
    deliveries: [{ order_id: 'order-a', delivered: true }],
  } });
  const { orders: [order] } = await api.getClientOrders('client-a');
  assert.equal(order.items[0].product_name, 'Camisa de prueba');
  assert.equal(order.total, 230);
  assert.equal(order.advance, 100);
  assert.equal(order.balance, 43.34);
  assert.equal(order.payment_plan[0].amount, 43.33);
  assert.equal(order.delivered, true);
  assert.ok(calls.slice(1).every(call => call.ids.length === 1 && call.ids[0] === 'order-a'));
});

test('empty history does not fetch unrelated order details', async () => {
  const { api, calls } = await historyApi();
  const result = await api.getClientOrders('client-a');
  assert.equal(result.orders.length, 0);
  assert.equal(result.count, 0);
  assert.equal(calls.length, 1);
});

test('invalid requests and unauthenticated access do not query orders', async () => {
  const { api, calls } = await historyApi({ user: null });
  await assert.rejects(api.getClientOrders('client-a'), /Not authenticated/);
  await assert.rejects(api.getClientOrders(null), /Invalid client history/);
  await assert.rejects(api.getClientOrders('client-a', -1), /Invalid client history/);
  await assert.rejects(api.getClientOrders('client-a', 0.5), /Invalid client history/);
  assert.equal(calls.length, 0);
});

test('order or detail failures are propagated instead of showing an empty history', async () => {
  for (const table of ['orders', 'order_items', 'payments', 'deliveries']) {
    const { api } = await historyApi({ rows: [row('order-a')], failure: { [table]: new Error('Test failure') } });
    await assert.rejects(api.getClientOrders('client-a'), /Test failure/);
  }
});
