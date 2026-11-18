import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';

async function settingsApi(existing, failure = null) {
  const writes = [];
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
    from(table) {
      assert.equal(table, 'settings');
      let row;
      const query = {
        select() { return query; }, eq() { return query; },
        maybeSingle: async () => ({ data: existing, error: failure }),
        update(value) { row = value; writes.push(value); return query; },
        insert(value) { row = value; writes.push(value); return query; },
        single: async () => ({ data: { ...existing, ...row } }),
      };
      return query;
    },
  };
  const module = new SourceTextModule(await readFile(new URL('../src/api/entities.js', import.meta.url), 'utf8'));
  await module.link(specifier => {
    if (specifier === '@/lib/supabase') return new SyntheticModule(['supabase'], function () { this.setExport('supabase', supabase); });
    if (specifier === '@/lib/access') return new SyntheticModule(['requireActiveAccess'], function () { this.setExport('requireActiveAccess', async () => true); });
    throw new Error(`Unexpected import: ${specifier}`);
  });
  await module.evaluate();
  return { api: module.namespace, writes };
}

test('saving preferences or opting in never republishes a private catalog', async () => {
  const { api, writes } = await settingsApi({ id: 'settings', catalog_slug: 'demo', catalog_public: false });
  await api.upsertSettings({ shop_name: 'Nombre nuevo' });
  await api.upsertSettings({ catalog_orders_enabled: true });
  assert.ok(writes.every(row => row.catalog_public === false && row.catalog_slug === 'demo'));
  await api.upsertSettings({ catalog_public: true });
  assert.equal(writes.at(-1).catalog_public, true);
});

test('settings lookup errors cannot fall through to a new public catalog', async () => {
  const { api, writes } = await settingsApi(null, new Error('offline'));
  await assert.rejects(api.upsertSettings({ shop_name: 'Test' }), /offline/);
  assert.equal(writes.length, 0);
});
