import { supabase } from '@/lib/supabase';
import { isTrackingToken } from '@/lib/order-reference';

export async function manageOrderTracking(orderId, action = 'get') {
  const { data, error } = await supabase.rpc('manage_order_tracking', {
    p_order_id: orderId, p_action: action,
  });
  if (error) throw error;
  return data;
}

export async function getPublicOrderTracking(token) {
  if (!isTrackingToken(token)) return null;
  const { data, error } = await supabase.rpc('get_public_order_tracking', { p_token: token });
  if (error) throw error;
  return data?.[0] || null;
}
