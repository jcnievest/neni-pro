import { createClient } from '@supabase/supabase-js';
import { handleCatalogPresentation } from '../server/catalog-presentation.js';

export default {
  async fetch(request) {
    let admin = null;
    try {
      const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.trim();
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
      if (url && key) admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    } catch {
      // Fail closed on invalid deployment configuration without exposing credentials.
    }
    return handleCatalogPresentation(request, admin);
  },
};
