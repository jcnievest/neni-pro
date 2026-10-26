# Folios y seguimiento de pedidos

## Deployment order

1. Test `supabase/migrations/20261026000000_order_tracking.sql` in staging, then apply it using the Supabase SQL editor or migrations workflow before deploying the frontend.
2. The migration assigns a unique permanent reference to existing and new orders. Existing numbering follows PostgreSQL's backfill order, not chronological order. Gaps are normal. References are global, not per shop.
3. Deploy frontend after migration succeeds. No links are enabled by the migration; the owner explicitly creates each link in the order detail.

## Privacy

- Public access is by random UUID token, never by reference number or internal order ID.
- Only four fields are returned: reference, recorded status, delivery flag and delivery date. No customer details, items, monetary values, notes or bank details.
- Links are bearer credentials: anyone receiving a forwarded link can read these four fields. Owners can revoke a link; recreating it generates a different token.
- Tables remain protected by RLS. Link administration uses an ownership-checked RPC; anonymous callers can only execute the restricted lookup RPC.
- Tokens use the URL fragment (not sent in page requests/referrer). Meta Pixel does not initialize on the tracking route. The route is marked noindex and no-referrer in Vercel headers.
- The page refreshes every minute or on demand. It reports existing order/payment/delivery statuses, not invented packing or shipping stages.

## Local verification

`node --test tests/order-tracking.test.mjs` tests formatting and token validation.

Set `PGLITE_MODULE` to a local PGlite module to additionally execute the migration against an isolated PostgreSQL-compatible database. Tests cover existing/new references, anonymous lookup, restricted output, denied cross-owner access, revocation, new tokens, deletion and live status changes.

`tests/tracking-preview.html` is a local-only UI fixture using fictitious data, with no backend requests. Its refresh button simulates delivery.

## Staging acceptance before publishing

- Verify the folio matches across Pedidos, order detail and Entregas.
- Create a link as owner, open logged out, update the real staging order, and refresh.
- Revoke and recreate; the old URL must remain unavailable.
- Verify another staging user cannot get, enable or revoke the link.
- Check malformed/missing links, network failures, mobile and dark-mode owner UI.
- Confirm deployed Vercel headers and absence of Pixel requests on `/seguimiento`.

Production database changes and end-to-end Supabase/Vercel verification have not been performed as part of local implementation.
