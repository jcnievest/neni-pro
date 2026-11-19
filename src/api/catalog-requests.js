import { supabase } from '@/lib/supabase';

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message || 'No pudimos completar la solicitud. Intenta nuevamente.');
  return data;
}

export const getPublicCatalog = slug => rpc('get_public_catalog', { p_slug: slug });
export const submitCatalogRequest = args => rpc('submit_catalog_request', args);
export const getCatalogRequestReceipt = (slug, operation) => rpc('get_catalog_request_receipt', { p_slug: slug, p_operation: operation });
export const getCatalogRequest = token => rpc('get_catalog_request', { p_token: token });
export const respondCatalogRequest = (token, version, action) => rpc('respond_catalog_request', { p_token: token, p_version: version, p_action: action });
export const manageCatalogRequest = args => rpc('manage_catalog_request', args);

// First-party, bounded event names only. No contact, product, order or URL data.
export async function recordCatalogEvent(slug, visit, event) {
  if (!['public_catalog_viewed', 'catalog_product_selected', 'order_request_started'].includes(event)) return;
  try { await rpc('record_catalog_event', { p_slug: slug, p_visit: visit, p_event: event }); } catch { /* Measurement cannot block a request. */ }
}

export async function getCatalogRequests(userId, filter = 'open', page = 0) {
  if (!userId) throw new Error('Inicia sesión para consultar tus solicitudes.');
  if (!['open', 'waiting', 'all'].includes(filter) || !Number.isSafeInteger(page) || page < 0 || page > 10000) throw new Error('Filtro de solicitudes inválido.');
  let query = supabase.from('catalog_order_requests').select('*', { count: 'exact' }).eq('user_id', userId)
    .order('created_at', { ascending: false }).order('id').range(page * 20, page * 20 + 19);
  if (filter === 'open') query = query.eq('status', 'pending');
  else if (filter === 'waiting') query = query.eq('status', 'adjustment_pending');
  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: data, count };
}

export async function getPendingRequestCount(userId) {
  if (!userId) throw new Error('Inicia sesión para consultar tus solicitudes.');
  const { count, error } = await supabase.from('catalog_order_requests').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('status', 'pending');
  if (error) throw error;
  return count;
}

export async function getSellerRequest(userId, id) {
  const { data, error } = await supabase.from('catalog_order_requests').select('*').eq('user_id', userId).eq('id', id).single();
  if (error) throw error;
  if (!data) throw new Error('Solicitud no disponible.');
  return data;
}

export async function getRequestAudit(userId, id) {
  const { data, error } = await supabase.from('catalog_request_audit').select('id,action,version,actor,created_at').eq('user_id', userId).eq('request_id', id).order('created_at');
  if (error) throw error;
  return data;
}
