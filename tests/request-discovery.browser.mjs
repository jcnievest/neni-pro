// Local disposable database only. All external traffic is blocked.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:5177';
const api = process.env.TEST_API || 'http://127.0.0.1:54332';
for (const url of [origin, api]) assert.equal(new URL(url).hostname, '127.0.0.1');
const screenshots = process.env.SCREENSHOTS_DIR || new URL('../docs/request-discovery/screenshots/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
await fetch(`${api}/test/reset`, { method: 'POST' });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], analytics = [];
const owner = '10000000-0000-4000-8000-000000000001';
const product = '20000000-0000-4000-8000-000000000003';
async function request(path, token, method = 'GET', body) {
  const response = await fetch(`${api}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || 'local-anon'}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  assert.ok(response.ok, JSON.stringify(data)); return data;
}
const session = await request('/auth/v1/token', null, 'POST', { email: 'demo@example.test', password: 'test-password' });
const token = session.access_token;
const rpc = (name, args, credential = token) => request(`/rest/v1/rpc/${name}`, credential, 'POST', args);
async function submit(index) {
  return rpc('submit_catalog_request', { p_slug: 'demo', p_operation: randomUUID(), p_items: [{ product_id: product, quantity: 1, expected_unit_price: 100 }], p_name: `Comprador ficticio ${index}`, p_phone: String(5500000000 + index), p_notes: '', p_consent: true, p_website: '' }, null);
}
async function page() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route('**/*', route => {
    const r = route.request();
    if (r.url().includes('/rpc/record_seller_catalog_event')) analytics.push(r.postDataJSON());
    return [origin, api].includes(new URL(r.url()).origin) ? route.continue() : route.abort();
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async value => { window.sharedCatalogUrl = value; } }, configurable: true });
  });
  const p = await context.newPage(); p.setDefaultTimeout(10000);
  p.on('pageerror', error => errors.push(error.message)); return p;
}
async function login(p, email = 'demo@example.test') {
  await p.goto(`${origin}/login`); await p.getByLabel('Correo electrónico').fill(email);
  await p.getByLabel('Contraseña', { exact: true }).fill('test-password');
  await p.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(); await p.waitForURL('**/inicio');
}
const mainNav = p => p.getByRole('navigation', { name: 'Navegación principal' });
const views = p => p.getByRole('navigation', { name: 'Vistas de pedidos' });
async function fits(p) { assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow ${p.url()}`); }
async function shot(p, name) {
  await fits(p);
  await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await p.screenshot({ path: `${screenshots}${name}.png`, animations: 'disabled' });
}
try {
  const seller = await page(), buyer = await page(), other = await page();
  await login(seller);
  await seller.getByRole('link', { name: 'Habilitar solicitudes', exact: true }).waitFor();
  assert.equal(await seller.getByRole('heading', { name: 'Solicitudes por atender' }).count(), 0);
  await shot(seller, 'home-disabled-mobile');
  await seller.getByRole('link', { name: 'Habilitar solicitudes', exact: true }).click();
  await seller.waitForURL('**/mi-catalogo#solicitudes-catalogo');
  await seller.waitForFunction(() => document.activeElement?.id === 'solicitudes-catalogo');
  const toggle = seller.getByRole('switch', { name: 'Permitir que mis clientes soliciten pedidos desde mi catálogo' });
  assert.equal(await toggle.getAttribute('aria-checked'), 'false');
  await buyer.goto(`${origin}/catalogo?tienda=demo`);
  assert.equal(await buyer.getByRole('button', { name: /^Solicitar pedido/ }).count(), 0);
  await toggle.click(); await seller.getByText('Guardado', { exact: true }).waitFor();
  await mainNav(seller).getByRole('link', { name: 'Inicio', exact: true }).click();
  await seller.getByRole('button', { name: 'Compartir mi catálogo' }).click();
  assert.equal(await seller.evaluate(() => window.sharedCatalogUrl), `${origin}/catalogo?tienda=demo`);
  await seller.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Denied'); } }, configurable: true }));
  await seller.getByRole('button', { name: 'Compartir mi catálogo' }).click();
  await seller.getByRole('dialog').waitFor();
  assert.equal(await seller.getByRole('textbox', { name: 'Enlace de tu catálogo' }).inputValue(), `${origin}/catalogo?tienda=demo`);
  await seller.keyboard.press('Escape');
  await shot(seller, 'home-share-mobile');

  await buyer.reload(); await buyer.getByRole('button', { name: 'Seleccionar', exact: true }).first().waitFor();
  await buyer.locator('div.bg-card').filter({ has: buyer.getByText('Bolsa bajo pedido', { exact: true }) }).getByRole('button', { name: 'Seleccionar', exact: true }).click();
  await buyer.getByRole('button', { name: 'Solicitar pedido (1)' }).click();
  await buyer.getByLabel('Nombre', { exact: true }).fill('Comprador ficticio 1');
  await buyer.getByLabel('WhatsApp', { exact: true }).fill('5500000001'); await buyer.getByRole('checkbox').check();
  await buyer.getByRole('button', { name: 'Revisar solicitud', exact: true }).click();
  await buyer.getByRole('button', { name: 'Enviar solicitud de pedido', exact: true }).click();
  await buyer.getByText('¡Listo! Enviamos tu solicitud al vendedor.', { exact: true }).waitFor();
  await shot(buyer, 'buyer-sent-mobile');
  await seller.reload(); await seller.getByLabel('1 solicitudes por atender', { exact: true }).waitFor();
  const entry = seller.getByRole('region', { name: 'Solicitudes por atender' });
  assert.ok((await entry.boundingBox()).y < 350, 'Visible before operational indicators');
  assert.equal(await mainNav(seller).getByRole('link').count(), 4);
  await shot(seller, 'home-one-mobile');
  await submit(2); await submit(3);
  await seller.reload(); await seller.getByLabel('3 solicitudes por atender', { exact: true }).waitFor();
  await shot(seller, 'home-pending-mobile');
  await seller.setViewportSize({ width: 1280, height: 800 }); await shot(seller, 'home-pending-desktop');
  await seller.getByRole('link', { name: 'Revisar solicitudes', exact: true }).focus(); await seller.keyboard.press('Enter');
  await seller.waitForURL('**/pedidos/solicitudes');
  await seller.getByText('Comprador ficticio 1', { exact: true }).waitFor();
  assert.equal(await views(seller).getByRole('link', { name: /Por confirmar/ }).getAttribute('aria-current'), 'page');
  await shot(seller, 'requests-desktop');
  await seller.setViewportSize({ width: 320, height: 740 }); await fits(seller);
  await seller.setViewportSize({ width: 390, height: 844 }); await shot(seller, 'requests-mobile');
  await seller.getByRole('link').filter({ hasText: 'Comprador ficticio 1' }).click();
  await seller.getByRole('button', { name: 'Confirmar pedido', exact: true }).click(); await seller.waitForURL('**/pedido/*');
  await mainNav(seller).getByLabel('2 solicitudes por confirmar', { exact: true }).waitFor();
  await mainNav(seller).getByRole('link', { name: /Pedidos/ }).click();
  await seller.getByText('Comprador ficticio 1', { exact: true }).waitFor();
  assert.equal(await seller.getByText('Comprador ficticio 1', { exact: true }).count(), 1);
  assert.equal(await views(seller).getByRole('link', { name: 'Mis pedidos', exact: true }).getAttribute('aria-current'), 'page');
  await views(seller).getByRole('link', { name: /Por confirmar/ }).click();
  await seller.getByRole('link').filter({ hasText: 'Comprador ficticio 2' }).click();
  await seller.getByRole('button', { name: 'Rechazar', exact: true }).click();
  await seller.getByRole('button', { name: 'Sí, continuar', exact: true }).click();
  await seller.getByText('Rechazada', { exact: true }).waitFor();
  await mainNav(seller).getByLabel('1 solicitudes por confirmar', { exact: true }).waitFor();
  await seller.getByRole('link', { name: 'Solicitudes recibidas', exact: true }).click();
  await seller.getByRole('link').filter({ hasText: 'Comprador ficticio 3' }).click();
  await seller.getByRole('button', { name: 'Modificar', exact: true }).click();
  await seller.getByLabel('Condiciones para el comprador').fill('Propuesta ficticia para aceptar');
  await seller.getByRole('button', { name: 'Guardar propuesta', exact: true }).click();
  await seller.getByText('Ajuste pendiente', { exact: true }).waitFor();
  await seller.waitForFunction(() => !document.querySelector('nav[aria-label="Navegación principal"] [aria-label$="solicitudes por confirmar"]'));
  await seller.getByRole('link', { name: 'Solicitudes recibidas', exact: true }).click();
  await seller.getByText('No hay solicitudes por confirmar.', { exact: true }).waitFor();
  await seller.getByLabel('Estado de solicitudes').selectOption('waiting');
  await seller.getByText('Comprador ficticio 3', { exact: true }).waitFor();
  await seller.getByRole('link').filter({ hasText: 'Comprador ficticio 3' }).click();
  await seller.getByRole('link', { name: 'Solicitudes recibidas', exact: true }).click();
  assert.equal(await seller.getByLabel('Estado de solicitudes').inputValue(), 'waiting');
  await seller.getByLabel('Estado de solicitudes').selectOption('all');
  await seller.getByText('Confirmada', { exact: true }).waitFor();
  await seller.getByText('Rechazada', { exact: true }).waitFor();
  await shot(seller, 'requests-history-mobile');
  await login(other, 'second@example.test');
  await other.goto(`${origin}/pedidos/solicitudes?estado=all`);
  await other.getByText('Aún no has recibido solicitudes.', { exact: true }).waitFor();
  const requests = await request(`/rest/v1/catalog_order_requests?user_id=eq.${owner}`, token);
  const waiting = requests.find(r => r.status === 'adjustment_pending');
  await other.goto(`${origin}/pedidos/solicitudes/${waiting.id}`);
  await other.getByText('No pudimos consultar esta solicitud.', { exact: true }).waitFor();
  assert.equal(await other.getByText('Comprador ficticio 3', { exact: true }).count(), 0);
  await rpc('respond_catalog_request', { p_token: waiting.public_token, p_version: waiting.version, p_action: 'accept' }, null);
  await seller.goto(`${origin}/inicio`); await seller.getByLabel('1 solicitudes por atender', { exact: true }).waitFor();

  for (let i = 4; i <= 24; i++) await submit(i);
  await seller.goto(`${origin}/pedidos/solicitudes`);
  await seller.getByRole('button', { name: 'Página siguiente' }).click();
  await seller.getByText('2 / 2', { exact: true }).waitFor();
  await seller.locator('a[href^="/pedidos/solicitudes/"]').first().click();
  await seller.getByRole('link', { name: 'Solicitudes recibidas', exact: true }).click();
  await seller.getByText('2 / 2', { exact: true }).waitFor();
  await seller.goto(`${origin}/mensajes`); await seller.getByRole('switch', { name: 'Vista oscura' }).click();
  await seller.waitForFunction(() => document.documentElement.classList.contains('dark'));
  await seller.goto(`${origin}/pedidos/solicitudes`);
  await seller.locator('a[href^="/pedidos/solicitudes/"]').first().waitFor(); await shot(seller, 'requests-dark-mobile');
  await request(`/rest/v1/subscriptions?user_id=eq.${owner}`, token, 'PATCH', { status: 'inactive', trial_end: '2020-01-01' });
  await seller.reload(); await seller.getByText('Modo solo lectura', { exact: true }).waitFor();
  await seller.locator('a[href^="/pedidos/solicitudes/"]').first().click();
  assert.ok(await seller.getByRole('button', { name: 'Confirmar pedido', exact: true }).isDisabled());
  assert.ok(await seller.getByRole('button', { name: 'Rechazar', exact: true }).isDisabled());
  await request(`/rest/v1/subscriptions?user_id=eq.${owner}`, token, 'PATCH', { status: 'trialing', trial_end: new Date(Date.now() + 86400000 * 3).toISOString() });
  await seller.reload(); assert.ok(await seller.getByRole('button', { name: 'Confirmar pedido', exact: true }).isEnabled());
  await request(`/rest/v1/settings?user_id=eq.${owner}`, token, 'PATCH', { catalog_public: false });
  await seller.goto(`${origin}/mensajes#solicitudes-catalogo`);
  await seller.getByRole('switch', { name: 'Publicar mi catálogo', exact: true }).waitFor();
  assert.equal((await request(`/rest/v1/settings?user_id=eq.${owner}`, token))[0].catalog_public, false);
  await seller.getByRole('switch', { name: 'Publicar mi catálogo', exact: true }).click();
  await seller.getByText('Guardado', { exact: true }).waitFor();
  await seller.route('**/rest/v1/catalog_order_requests?*', route => route.request().method() === 'HEAD' ? route.fulfill({ status: 400, contentType: 'application/json', body: '{"message":"offline"}' }) : route.continue());
  await seller.goto(`${origin}/inicio`); await seller.getByText('No pudimos consultar tus solicitudes.', { exact: true }).waitFor();
  assert.equal(await seller.getByRole('button', { name: 'Compartir mi catálogo' }).count(), 0);
  assert.ok(analytics.length > 0);
  assert.ok(analytics.every(args => Object.keys(args).sort().join(',') === 'p_event,p_visit'));
  const recorded = await request(`/rest/v1/catalog_events?user_id=eq.${owner}`, token);
  for (const name of ['order_requests_entry_viewed','order_requests_opened','order_request_review_started','catalog_share_clicked']) assert.equal(recorded.filter(r => r.event_name === name).length, 1, name);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, screenshots, checks: ['zero/one/multiple requests', 'activation only by user', 'share/fallback', 'buyer copy', 'home keyboard entry', 'four navigation items', 'requests/orders routes', 'confirmation/rejection refresh badges', 'waiting/history filters', 'pagination deep links', 'seller isolation', 'expired read-only and active trial', 'private catalog preserved', 'network error not zero', 'four private deduplicated events', '320/390/1280 and dark mode'] }));
} catch (error) {
  for (const context of browser.contexts()) for (const p of context.pages()) console.error(p.url(), (await p.locator('body').innerText()).slice(0,7000));
  throw error;
} finally { await browser.close(); }
