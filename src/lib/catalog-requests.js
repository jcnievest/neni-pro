export const requestStatuses = {
  pending: 'Por confirmar', adjustment_pending: 'Ajuste pendiente', confirmed: 'Confirmada',
  rejected: 'Rechazada', cancelled: 'Cancelada',
};

export function isCatalogOffer(product, today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date())) {
  return Boolean(product.is_offer && product.offer_price != null && (!product.offer_expiry || product.offer_expiry >= today));
}

export function catalogPrice(product, today) {
  return Number(isCatalogOffer(product, today) ? product.offer_price : product.price);
}

export function availabilityLabel(product) {
  if (product.made_to_order || product.availability === 'on_request') return 'Bajo pedido · sujeto a confirmación';
  if (product.stock == null) return 'Disponibilidad por confirmar';
  return Number(product.stock) > 0 ? `Disponible: ${product.stock}` : 'Agotado';
}

export function quantityIssue(product, quantity) {
  if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 1000) return 'Elige entre 1 y 1000 unidades.';
  if (!product.made_to_order && product.stock != null && Number(quantity) > Number(product.stock)) {
    return `Disponible: ${product.stock}. Ajusta la cantidad para continuar.`;
  }
  return '';
}

export const money = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value) || 0);
export const isRequestToken = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || '');

export function requestLink(token, origin = window.location.origin) {
  if (!isRequestToken(token)) throw new Error('Enlace de solicitud inválido.');
  return `${origin}/solicitud#${token}`;
}

export function whatsappLink(phone, message) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `52${digits}`;
  if (!/^\d{10,15}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function catalogSessionId(slug, purpose, storage) {
  const key = `nenis:catalog:v1:${slug}:${purpose}`;
  try {
    storage ??= window.sessionStorage;
    const saved = storage.getItem(key);
    if (isRequestToken(saved)) return saved;
  } catch { /* Memory-only operation still works in private mode. */ }
  const id = crypto.randomUUID();
  try { storage.setItem(key, id); } catch { /* Do not store contact details. */ }
  return id;
}
