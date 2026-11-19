import { supabase } from '@/lib/supabase';
import { createSellerCatalogAnalytics } from './seller-catalog-analytics';

export const trackSellerCatalog = createSellerCatalogAnalytics(
  typeof window === 'undefined' ? null : window,
  args => supabase.rpc('record_seller_catalog_event', args),
);
