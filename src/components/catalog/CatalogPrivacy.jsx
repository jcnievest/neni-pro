import { useLayoutEffect } from 'react';

export default function CatalogPrivacy() {
  useLayoutEffect(() => {
    // Also cover navigation from a page where the existing Pixel was already loaded.
    try { window.fbq?.('consent', 'revoke'); } catch { /* Blockers must not affect the form. */ }
  }, []);
  return null;
}
