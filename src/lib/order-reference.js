export function formatOrderReference(reference) {
  if (reference == null || !/^\d+$/.test(String(reference))) return null;
  return `NP-${String(reference).padStart(6, '0')}`;
}

export function isTrackingToken(token) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token || '');
}

export function trackingUrl(token, origin) {
  if (!isTrackingToken(token)) throw new Error('Invalid tracking token');
  return `${origin}/seguimiento#${token}`;
}
