import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import { randomUUID } from 'node:crypto';
import { createSellerCatalogAnalytics, SELLER_CATALOG_EVENTS } from '../src/lib/seller-catalog-analytics.js';

async function requestsApi(rows = [], failure = null) {
  const calls = [];
  const supabase = {
    from(table) {
      assert.equal(table, 'catalog_order_requests');
      const call = { filters: [] }; calls.push(call);
      const q = {
        select(columns, options) { call.options = options; return q; },
        eq(key, value) { call.filters.push([key, value]); return q; },
        order() { return q; }, range(start, end) { call.range = [start, end]; return q; },
        then(resolve, reject) {
          let data = rows.filter(row => call.filters.every(([key, value]) => row[key] === value));
          const count = data.length;
          if (call.range) data = data.slice(call.range[0], call.range[1] + 1);
          return Promise.resolve({ data: call.options.head ? null : data, count, error: failure }).then(resolve, reject);
        },
      };
      return q;
    },
  };
  const module = new SourceTextModule(await readFile(new URL('../src/api/catalog-requests.js', import.meta.url), 'utf8'));
  await module.link(() => new SyntheticModule(['supabase'], function () { this.setExport('supabase', supabase); }));
  await module.evaluate();
  return { api: module.namespace, calls };
}

test('count and initial list include only seller-actionable requests, never waiting or closed ones', async () => {
  const rows = ['pending', 'adjustment_pending', 'confirmed', 'rejected', 'cancelled'].map((status, i) => ({ id: i, user_id: 'owner', status }));
  rows.push({ id: 6, user_id: 'other', status: 'pending' });
  const { api, calls } = await requestsApi(rows);
  assert.equal(await api.getPendingRequestCount('owner'), 1);
  assert.equal((await api.getCatalogRequests('owner')).count, 1);
  assert.equal((await api.getCatalogRequests('owner', 'waiting')).rows[0].status, 'adjustment_pending');
  assert.equal((await api.getCatalogRequests('owner', 'all')).count, 5);
  assert.ok(calls[0].options.head);
  assert.ok(calls.every(call => call.filters.some(([key, value]) => key === 'user_id' && value === 'owner')));
  rows[0].status = 'confirmed';
  assert.equal(await api.getPendingRequestCount('owner'), 0);
  rows[1].status = 'pending';
  assert.equal(await api.getPendingRequestCount('owner'), 1);
  rows[1].status = 'rejected';
  assert.equal(await api.getPendingRequestCount('owner'), 0);
});

test('zero/multiple counts, pagination and failures never fabricate an empty success', async () => {
  const empty = await requestsApi();
  assert.equal(await empty.api.getPendingRequestCount('owner'), 0);
  const { api } = await requestsApi(Array.from({ length: 21 }, (_, i) => ({ id: i, user_id: 'owner', status: 'pending' })));
  assert.equal(await api.getPendingRequestCount('owner'), 21);
  assert.equal((await api.getCatalogRequests('owner', 'open', 0)).rows.length, 20);
  assert.equal((await api.getCatalogRequests('owner', 'open', 1)).rows.length, 1);
  const broken = await requestsApi([], new Error('offline'));
  await assert.rejects(broken.api.getPendingRequestCount('owner'), /offline/);
  await assert.rejects(broken.api.getCatalogRequests('owner'), /offline/);
  await assert.rejects(api.getPendingRequestCount(null));
  for (const page of [-1, 0.1, 10001]) await assert.rejects(api.getCatalogRequests('owner', 'open', page));
  await assert.rejects(api.getCatalogRequests('owner', 'unknown'));
});

function browser(storage = new Map()) {
  return { crypto: { randomUUID }, sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } };
}

test('seller events deduplicate renders/concurrent calls/reloads, separate accounts, and omit all sensitive fields', async () => {
  const calls = [], b = browser();
  const record = async args => { calls.push(args); return { data: true }; };
  const track = createSellerCatalogAnalytics(b, record);
  await Promise.all(Array.from({ length: 3 }, () => track('owner', 'order_requests_entry_viewed')));
  assert.equal(calls.length, 1);
  for (const event of SELLER_CATALOG_EVENTS) await track('owner', event);
  assert.equal(calls.length, 4);
  await createSellerCatalogAnalytics(b, record)('owner', 'order_requests_entry_viewed');
  assert.equal(calls[4].p_visit, calls[0].p_visit, 'Reload reuses server deduplication key');
  await track('other', 'order_requests_entry_viewed');
  assert.notEqual(calls[5].p_visit, calls[0].p_visit);
  assert.ok(calls.every(call => Object.keys(call).sort().join(',') === 'p_event,p_visit'));
  assert.equal(await track(null, 'catalog_share_clicked'), false);
  assert.equal(await track('owner', 'unknown'), false);
  assert.equal(calls.length, 6);
});

test('missing migration, failed analytics, and denied storage cannot block the seller workflow', async () => {
  const b = browser();
  Object.defineProperty(b, 'sessionStorage', { get() { throw new Error('Denied'); } });
  const calls = [];
  const track = createSellerCatalogAnalytics(b, async args => { calls.push(args); return calls.length === 1 ? { error: 'RPC absent' } : { data: true }; });
  assert.equal(await track('owner', 'catalog_share_clicked'), false);
  assert.equal(await track('owner', 'catalog_share_clicked'), true);
  assert.equal(calls[0].p_visit, calls[1].p_visit);
  assert.equal(await track('owner', 'catalog_share_clicked'), true);
  assert.equal(calls.length, 2);
  assert.equal(await createSellerCatalogAnalytics(b, () => { throw new Error('offline'); })('owner', 'order_requests_opened'), false);
});
