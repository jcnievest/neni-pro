// Loopback-only fake Auth API for manual UI checks. No external requests or real users.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated',
  email: 'demo@example.test', email_confirmed_at: '2026-10-08T12:00:00Z', created_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {} };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.fake-test-signature`;
const session = { access_token: token, refresh_token: 'fake-refresh-token', token_type: 'bearer', expires_in: 3600, user };
const tables = Object.fromEntries(['clients', 'products', 'orders', 'order_items', 'payments', 'deliveries'].map(name => [name, []]));
createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5174');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,content-type,x-client-info,x-supabase-api-version,accept-profile,content-profile,prefer');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1:54329');
  if (url.pathname === '/auth/v1/authorize') {
    const redirect = new URL(url.searchParams.get('redirect_to'));
    if (redirect.origin !== 'http://127.0.0.1:5174') { res.writeHead(400); res.end(); return; }
    redirect.hash = `access_token=${token}&refresh_token=fake-refresh-token&expires_in=3600&token_type=bearer&type=signup`;
    res.writeHead(302, { Location: redirect.href }); res.end(); return;
  }
  if (url.pathname === '/') {
    res.setHeader('Content-Type', 'text/html');
    const hash = `#access_token=${token}&refresh_token=fake-refresh-token&expires_in=3600&token_type=bearer&type=`;
    res.end(`<h1>Local fake authentication</h1><a href="http://127.0.0.1:5174/auth/confirm?utm_source=instagram&utm_campaign=negocio-con-orden${hash}signup">Confirm test account</a><p><a href="http://127.0.0.1:5174/reset-password${hash}recovery">Reset test password</a></p>`);
    return;
  }
  let body = '';
  for await (const chunk of req) body += chunk;
  const input = body ? JSON.parse(body) : {};
  let result = {};
  let status = 200;
  if (url.pathname.endsWith('/signup')) result = { ...user, email_confirmed_at: null, identities: [{ id: 'fake-identity' }] };
  else if (url.pathname.endsWith('/token')) {
    if (input.password === 'wrong-password') { status = 400; result = { msg: 'Invalid login credentials', error_code: 'invalid_credentials' }; }
    else result = session;
  } else if (url.pathname.endsWith('/user')) result = user;
  else if (url.pathname.includes('/subscriptions')) result = [{ status: 'active' }];
  else if (url.pathname.startsWith('/rest/v1/')) {
    const table = tables[url.pathname.slice('/rest/v1/'.length)];
    if (!table) result = [];
    else if (req.method === 'POST') {
      if (url.pathname.endsWith('/orders') && input.notes === 'simulate-order-failure') {
        status = 500; result = { message: 'Fallo simulado: no se guardo el pedido.' };
      } else {
        const rows = (Array.isArray(input) ? input : [input]).map(row => ({ id: randomUUID(), created_at: new Date().toISOString(), ...row }));
        table.push(...rows);
        result = req.headers.accept?.includes('vnd.pgrst.object') ? rows[0] : rows;
      }
    } else {
      const rows = table.filter(row => [...url.searchParams].every(([key, value]) => {
        if (value.startsWith('eq.')) return String(row[key]) === value.slice(3);
        if (value.startsWith('in.(')) return value.slice(4, -1).split(',').includes(String(row[key]));
        return true;
      }));
      result = req.headers.accept?.includes('vnd.pgrst.object') ? rows[0] ?? null : rows;
    }
  }
  res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(result));
}).listen(54329, '127.0.0.1', () => console.log('Fake Auth on http://127.0.0.1:54329'));
