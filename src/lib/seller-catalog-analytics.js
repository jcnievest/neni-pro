export const SELLER_CATALOG_EVENTS = [
  'order_requests_entry_viewed', 'order_requests_opened',
  'order_request_review_started', 'catalog_share_clicked',
  'catalog_menu_opened', 'catalog_logo_uploaded', 'catalog_preview_opened',
];

// One signal per seller/event/tab session. Only an event name and random key leave the client.
export function createSellerCatalogAnalytics(browser, record) {
  const pending = new Map();
  const completed = new Set();
  const keys = new Map();
  return async function track(userId, event) {
    if (!browser || !userId || !SELLER_CATALOG_EVENTS.includes(event)) return false;
    const key = `nenis:seller-catalog:v1:${userId}:${event}`;
    if (completed.has(key)) return true;
    if (pending.has(key)) return pending.get(key);
    const operation = (async () => {
      try {
        let id = keys.get(key);
        if (!id) {
          try { id = browser.sessionStorage.getItem(key); } catch { /* Memory fallback. */ }
          if (!/^[0-9a-f-]{36}$/i.test(id || '')) id = browser.crypto.randomUUID();
          keys.set(key, id);
          try { browser.sessionStorage.setItem(key, id); } catch { /* No contact data is stored. */ }
        }
        const { data, error } = await record({ p_event: event, p_visit: id });
        if (error || data === false) return false;
        completed.add(key);
        return true;
      } catch { return false; }
    })();
    pending.set(key, operation);
    try { return await operation; } finally { pending.delete(key); }
  };
}
