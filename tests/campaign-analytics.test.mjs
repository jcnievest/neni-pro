import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaignAnalytics, cleanAttribution } from '../src/lib/campaign-analytics.js';

function setup(host = 'www.nenispro.com', search = '') {
  const events = [], calls = [], claimed = new Set(), stored = new Map();
  const browser = { location: { hostname: host, origin: `https://${host}`, search },
    localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) },
    fbq: (...args) => events.push(args),
  };
  const claim = async args => {
    calls.push(args);
    if (claimed.has(args.p_event)) return { data: null };
    claimed.add(args.p_event);
    return { data: { event_id: 'opaque-event-id', attribution: args.p_attribution } };
  };
  return { browser, events, calls, claim, analytics: createCampaignAnalytics(browser, claim) };
}
const user = { id: 'internal-user-id', email_confirmed_at: '2026-10-08T12:00:00Z', email: 'fiction@example.test' };

test('CTA and accepted request are separate custom events, never confirmation', () => {
  const { analytics, events } = setup();
  analytics.trackCta('hero'); analytics.trackRequest('email'); analytics.trackRequest('google');
  assert.deepEqual(events.map(x => x.slice(0, 2)), [
    ['trackCustom', 'OrganizeBusinessClick'], ['trackCustom', 'RegistrationRequested'], ['trackCustom', 'RegistrationRequested'],
  ]);
});
test('unconfirmed or missing users never claim a milestone', async () => {
  const { analytics, calls } = setup();
  await analytics.milestone('CompleteRegistration', { ...user, email_confirmed_at: null });
  await analytics.milestone('CompleteRegistration', null);
  assert.equal(calls.length, 0);
});
test('concurrent callbacks, reloads and another device emit only one claimed confirmation', async () => {
  const { analytics, browser, claim, events } = setup();
  await Promise.all([analytics.milestone('CompleteRegistration', user), analytics.milestone('CompleteRegistration', user)]);
  await createCampaignAnalytics(browser, claim).milestone('CompleteRegistration', user);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], ['track', 'CompleteRegistration', {}, { eventID: 'opaque-event-id' }]);
  assert.ok(!JSON.stringify(events).includes(user.id));
  assert.ok(!JSON.stringify(events).includes(user.email));
});
test('first-order event requires a successful server claim and passes no order data to Pixel', async () => {
  const { analytics, events, calls } = setup();
  await analytics.milestone('FirstOrderSaved', user, 'internal-order-id');
  assert.equal(calls[0].p_order_id, 'internal-order-id');
  assert.equal(events[0][1], 'FirstOrderSaved');
  assert.ok(!JSON.stringify(events).includes('internal-order-id'));
});
test('missing, throwing and preview pixels do not break the app or consume milestones', async () => {
  const { analytics, browser, calls } = setup();
  delete browser.fbq;
  assert.equal(await analytics.milestone('CompleteRegistration', user), false);
  assert.equal(calls.length, 0);
  browser.fbq = () => { throw new Error('blocked'); };
  assert.doesNotThrow(() => analytics.trackRequest('email'));
  assert.equal(await analytics.milestone('CompleteRegistration', user), false);
  for (const host of ['localhost', '127.0.0.1', 'preview.vercel.app', 'nenispro.com.evil.test']) {
    const preview = setup(host);
    preview.analytics.trackCta('hero');
    await preview.analytics.milestone('CompleteRegistration', user);
    assert.equal(preview.events.length + preview.calls.length, 0);
  }
});
test('RPC failures or stalls cannot block navigation', async () => {
  const { browser } = setup();
  assert.equal(await createCampaignAnalytics(browser, async () => { throw new Error('offline'); }).milestone('CompleteRegistration', user), false);
  assert.equal(await createCampaignAnalytics(browser, () => new Promise(() => {})).milestone('CompleteRegistration', user), false);
});
test('attribution survives navigation and redirects, ignores arbitrary/PII parameters and blocked storage', () => {
  const { analytics, browser } = setup('www.nenispro.com', '?utm_source=instagram&utm_campaign=negocio-con-orden&email=person@example.test&utm_content=5551234567&access_token=secret');
  assert.equal(analytics.registrationUrl('/auth/confirm'), '/auth/confirm?utm_source=instagram&utm_campaign=negocio-con-orden');
  browser.location.search = '';
  assert.deepEqual(createCampaignAnalytics(browser, async () => ({})).captureAttribution(), { utm_source: 'instagram', utm_campaign: 'negocio-con-orden' });
  browser.localStorage = { getItem() { throw new Error(); }, setItem() { throw new Error(); } };
  assert.doesNotThrow(() => createCampaignAnalytics(browser, async () => ({})).captureAttribution());
  assert.deepEqual(cleanAttribution({ name: 'Private', phone: '555', utm_source: 'person@example.test', utm_campaign: 'negocio-con-orden' }), { utm_campaign: 'negocio-con-orden' });
});
