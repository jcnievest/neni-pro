import { createOnboardingState } from './onboarding-state.js';

// Only campaign codes belong here. Never forward arbitrary URL parameters or user data.
export const CAMPAIGN_VALUES = {
  utm_source: ['facebook', 'instagram', 'whatsapp', 'meta', 'google'],
  utm_medium: ['paid_social', 'social', 'cpc', 'organic', 'email'],
  utm_campaign: ['negocio-con-orden'],
  utm_content: ['tia-nenis-video', 'orden-imagen', 'clientes', 'pedidos', 'cobros'],
};

export function cleanAttribution(values = {}) {
  return Object.fromEntries(Object.entries(CAMPAIGN_VALUES)
    .filter(([key, allowed]) => allowed.includes(values?.[key]))
    .map(([key]) => [key, values[key]]));
}

export function createCampaignAnalytics(browser, claimMilestone) {
  const storageKey = 'nenis:campaign:v1';
  let attribution = {};
  let captured = false;
  const pending = new Map();
  const onboarding = createOnboardingState(browser);
  const enabled = () => ['nenispro.com', 'www.nenispro.com'].includes(browser?.location.hostname);

  function captureAttribution() {
    if (!browser) return {};
    if (captured) return { ...attribution };
    captured = true;
    let expires = 0;
    try {
      const saved = JSON.parse(browser.localStorage.getItem(storageKey) || 'null');
      if (Number.isFinite(saved?.expires) && saved.expires > Date.now()) {
        attribution = cleanAttribution(saved.values);
        expires = saved.expires;
      }
    } catch { /* Storage may be unavailable in private browsing. */ }
    const incoming = cleanAttribution(Object.fromEntries(new URLSearchParams(browser.location.search)));
    if (Object.keys(incoming).length) {
      attribution = incoming;
      expires = Date.now() + 30 * 86400000;
    }
    try {
      browser.localStorage.setItem(storageKey, JSON.stringify({ values: attribution, expires }));
    } catch { /* Keep attribution in memory when storage is unavailable. */ }
    return { ...attribution };
  }

  function registrationUrl(path = '/register') {
    const url = new URL(path, browser.location.origin);
    Object.entries(captureAttribution()).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.pathname + url.search;
  }

  function send(name, parameters = {}, eventId) {
    if (!enabled() || typeof browser.fbq !== 'function') return false;
    try {
      const args = [name === 'CompleteRegistration' ? 'track' : 'trackCustom', name, parameters];
      if (eventId) args.push({ eventID: eventId });
      browser.fbq(...args);
      return true;
    } catch { return false; }
  }

  function trackCta(placement) {
    if (!['navigation', 'hero', 'price', 'closing'].includes(placement)) return;
    send('OrganizeBusinessClick', { ...captureAttribution(), placement });
  }

  function trackRequest(method) {
    if (['email', 'google'].includes(method)) send('RegistrationRequested', { ...captureAttribution(), method });
  }

  function trackOnboarding(name, user) {
    if (!['onboarding_viewed', 'onboarding_first_order_clicked', 'onboarding_dismissed'].includes(name)
      || !enabled() || !user?.id || !user.email_confirmed_at) return Promise.resolve(false);
    return onboarding.once(user.id, name, () => send(name, captureAttribution()));
  }

  async function milestone(name, user, orderId = null) {
    if (!enabled() || typeof browser.fbq !== 'function' || !user?.id || !user.email_confirmed_at) return false;
    const key = `${user.id}:${name}`;
    if (pending.has(key)) return pending.get(key);
    const operation = (async () => {
      let timeout;
      try {
        const { data, error } = await Promise.race([
          claimMilestone({ p_event: name, p_attribution: captureAttribution(), p_order_id: orderId }),
          new Promise((resolve) => { timeout = setTimeout(() => resolve({ data: null }), 1200); }),
        ]);
        if (error || !data?.event_id) return false;
        // Keep the existing server claim so older clients cannot count activation twice.
        return send(name === 'FirstOrderSaved' ? 'first_order_created' : name, cleanAttribution(data.attribution), data.event_id);
      } catch { return false; } finally { clearTimeout(timeout); }
    })();
    pending.set(key, operation);
    try { return await operation; } finally { pending.delete(key); }
  }

  return { captureAttribution, registrationUrl, trackCta, trackRequest, trackOnboarding, milestone };
}
