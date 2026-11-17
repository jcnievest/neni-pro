// UI preferences stay on this device and are scoped to the authenticated account.
export function createOnboardingState(browser) {
  const memory = new Map();
  const pending = new Set();
  const keyFor = (userId, flag) => `nenis:onboarding:v1:${userId}:${flag}`;

  function get(userId, flag) {
    if (!userId) return false;
    const key = keyFor(userId, flag);
    try {
      const saved = browser?.localStorage.getItem(key);
      if (saved != null) return saved === '1';
    } catch { /* Private browsing can block storage. */ }
    return memory.get(key) === true;
  }

  function set(userId, flag, value) {
    if (!userId) return;
    const key = keyFor(userId, flag);
    memory.set(key, value);
    try { browser?.localStorage.setItem(key, value ? '1' : '0'); } catch { /* Use memory for this visit. */ }
  }

  async function once(userId, flag, action) {
    if (!userId) return false;
    const key = keyFor(userId, flag);
    const run = async () => {
      if (get(userId, flag) || pending.has(key)) return false;
      pending.add(key);
      try {
        if (await action() === false) return false;
        set(userId, flag, true);
        return true;
      } finally { pending.delete(key); }
    };
    try {
      // Coordinate tabs when supported; storage + memory still work without Web Locks.
      return browser?.navigator?.locks?.request
        ? await browser.navigator.locks.request(key, run)
        : await run();
    } catch { return false; }
  }

  return { get, set, once };
}

export const onboardingState = createOnboardingState(typeof window === 'undefined' ? null : window);

export function firstOrderDescription(order) {
  const parts = ['Ahora puedes darle seguimiento desde Nenis Pro.'];
  if (Number(order.balance) > 0 && order.status !== 'cancelado') {
    parts.push('Consulta el saldo pendiente en Cobros.');
  }
  if (order.delivery_date && !order.delivered && order.status !== 'cancelado') {
    parts.push('Consulta la fecha de entrega en Entregas.');
  }
  return parts.join(' ');
}
