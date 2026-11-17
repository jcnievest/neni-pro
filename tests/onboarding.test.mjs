import test from 'node:test';
import assert from 'node:assert/strict';
import { createOnboardingState, firstOrderDescription } from '../src/lib/onboarding-state.js';

function browser() {
  const saved = new Map();
  return { localStorage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) } };
}

test('dismissal persists on return, can be restored, and never crosses accounts', () => {
  const device = browser();
  const state = createOnboardingState(device);
  assert.equal(state.get('a', 'dismissed'), false);
  state.set('a', 'dismissed', true);
  assert.equal(createOnboardingState(device).get('a', 'dismissed'), true);
  assert.equal(state.get('b', 'dismissed'), false);
  state.set('a', 'dismissed', false);
  assert.equal(createOnboardingState(device).get('a', 'dismissed'), false);
});

test('first-order feedback is displayed once per account even on repeated callbacks and reloads', async () => {
  const device = browser(), state = createOnboardingState(device);
  let shown = 0;
  const show = () => { shown++; };
  await Promise.all([state.once('a', 'celebrated', show), state.once('a', 'celebrated', show)]);
  await createOnboardingState(device).once('a', 'celebrated', show);
  assert.equal(shown, 1);
  await state.once('b', 'celebrated', show);
  assert.equal(shown, 2);
  await state.once(null, 'celebrated', show);
  assert.equal(shown, 2);
});

test('Web Locks coordinate first-order feedback across tabs', async () => {
  const device = browser();
  let queue = Promise.resolve();
  device.navigator = { locks: { request: (_key, action) => (queue = queue.then(action)) } };
  let shown = 0;
  await Promise.all([createOnboardingState(device).once('a', 'celebrated', () => { shown++; }),
    createOnboardingState(device).once('a', 'celebrated', () => { shown++; })]);
  assert.equal(shown, 1);
});

test('blocked storage and errors cannot break the app or record an undisplayed celebration', async () => {
  const device = { localStorage: { getItem() { throw new Error(); }, setItem() { throw new Error(); } } };
  const state = createOnboardingState(device);
  state.set('a', 'dismissed', true);
  assert.equal(state.get('a', 'dismissed'), true);
  assert.equal(await state.once('a', 'celebrated', () => false), false);
  assert.equal(await state.once('a', 'celebrated', () => { throw new Error(); }), false);
  assert.equal(state.get('a', 'celebrated'), false);
  assert.equal(await state.once('a', 'celebrated', () => true), true);
  assert.equal(await state.once('a', 'celebrated', () => true), false);
});

test('success description only mentions actual pending collections and scheduled deliveries', () => {
  const base = 'Ahora puedes darle seguimiento desde Nenis Pro.';
  assert.equal(firstOrderDescription({}), base);
  assert.equal(firstOrderDescription({ balance: 0, delivered: true, delivery_date: '2026-11-17' }), base);
  assert.equal(firstOrderDescription({ balance: 100, status: 'cancelado', delivery_date: '2026-11-17' }), base);
  assert.equal(firstOrderDescription({ balance: 100 }), `${base} Consulta el saldo pendiente en Cobros.`);
  assert.equal(firstOrderDescription({ delivery_date: '2026-11-17', delivered: false }), `${base} Consulta la fecha de entrega en Entregas.`);
  assert.equal(firstOrderDescription({ balance: 100, delivery_date: '2026-11-17', delivered: false }),
    `${base} Consulta el saldo pendiente en Cobros. Consulta la fecha de entrega en Entregas.`);
});
