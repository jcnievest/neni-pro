import { createClient } from '@supabase/supabase-js';
import { handleCatalogPresentation } from '../server/catalog-presentation.js';

export default {
  async fetch(request) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const admin = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
    return handleCatalogPresentation(request, admin);
  },
};
