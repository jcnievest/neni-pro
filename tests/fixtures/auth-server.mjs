// Loopback-only fake Auth API for manual UI checks. No external requests or real users.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
const port = Number(process.env.PORT || 54329);
const appOrigin = process.env.APP_ORIGIN || 'http://127.0.0.1:5174';
const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated',
  email: 'demo@example.test', email_confirmed_at: '2026-10-08T12:00:00Z', created_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {} };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.fake-test-signature`;
const session = { access_token: token, refresh_token: 'fake-refresh-token', token_type: 'bearer', expires_in: 3600, user };
const tables = Object.fromEntries(['clients', 'products', 'orders', 'order_items', 'payments', 'deliveries'].map(name => [name, []]));
const secondUser = { ...user, id: '00000000-0000-0000-0000-000000000002', email: 'second@example.test' };
const secondToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: secondUser.id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.fake-test-signature`;
const secondSession = { ...session, user: secondUser, access_token: secondToken };
let scenario = 'empty';
createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', appOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,content-type,x-client-info,x-supabase-api-version,accept-profile,content-profile,prefer');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1:54329');
  if (url.pathname === '/auth/v1/authorize') {
    const redirect = new URL(url.searchParams.get('redirect_to'));
    if (redirect.origin !== appOrigin) { res.writeHead(400); res.end(); return; }
    redirect.hash = `access_token=${token}&refresh_token=fake-refresh-token&expires_in=3600&token_type=bearer&type=signup`;
    res.writeHead(302, { Location: redirect.href }); res.end(); return;
  }
  if (url.pathname === '/') {
    res.setHeader('Content-Type', 'text/html');
    const hash = `#access_token=${token}&refresh_token=fake-refresh-token&expires_in=3600&token_type=bearer&type=`;
    res.end(`<h1>Local fake authentication</h1><a href="${appOrigin}/auth/confirm?utm_source=instagram&utm_campaign=negocio-con-orden${hash}signup">Confirm test account</a><p><a href="${appOrigin}/reset-password${hash}recovery">Reset test password</a></p>`);
    return;
  }
  let body = '';
  for await (const chunk of req) body += chunk;
  const input = body ? JSON.parse(body) : {};
  const currentUser = req.headers.authorization === `Bearer ${secondToken}` ? secondUser : user;
  // Disposable fixture controls, loopback only; never part of the production build.
  if (url.pathname === '/test/scenario' && req.method === 'POST') {
    scenario = input.scenario || 'empty';
    for (const rows of Object.values(tables)) rows.length = 0;
    if (scenario === 'existing') {
      const id = randomUUID();
      tables.orders.push({ id, user_id: user.id, reference_number: 100, client_name: 'Cliente ficticio', total: 300, advance: 50, balance: 250,
        delivered: false, delivery_date: '2026-12-20', status: 'apartado', created_at: '2026-10-01T12:00:00Z' });
      tables.deliveries.push({ id: randomUUID(), order_id: id, user_id: user.id, delivered: false, delivery_date: '2026-12-20' });
    }
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ scenario })); return;
  }
  if (url.pathname === '/test/counts') {
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(Object.fromEntries(Object.entries(tables).map(([key, rows]) => [key, rows.length])))); return;
  }
  let result = {};
  let status = 200;
  if (url.pathname.endsWith('/signup')) result = { ...user, email_confirmed_at: null, identities: [{ id: 'fake-identity' }] };
  else if (url.pathname.endsWith('/token')) {
    if (input.password === 'wrong-password') { status = 400; result = { msg: 'Invalid login credentials', error_code: 'invalid_credentials' }; }
    else result = input.email === secondUser.email ? secondSession : session;
  } else if (url.pathname.endsWith('/user')) result = currentUser;
  else if (url.pathname.includes('/subscriptions')) result = [{ status: 'active' }];
  else if (url.pathname.startsWith('/rest/v1/')) {
    const table = tables[url.pathname.slice('/rest/v1/'.length)];
    if (!table) result = [];
    else if (req.method === 'POST') {
      if ((url.pathname.endsWith('/orders') && input.notes === 'simulate-order-failure')
        || (url.pathname.endsWith('/order_items') && tables.orders.some(order => order.id === input[0]?.order_id && order.notes === 'simulate-items-failure'))) {
        status = 500; result = { message: 'Fallo simulado: no se guardo el pedido.' };
      } else {
        const rows = (Array.isArray(input) ? input : [input]).map(row => ({ id: randomUUID(), reference_number: 101 + table.length, created_at: new Date().toISOString(), ...row }));
        table.push(...rows);
        result = req.headers.accept?.includes('vnd.pgrst.object') ? rows[0] : rows;
      }
    } else {
      const firstOrderQuery = url.searchParams.get('select')?.includes('deliveries!inner');
      if (firstOrderQuery && scenario === 'query-error') {
        res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ message: 'Fallo simulado de consulta' })); return;
      }
      if (firstOrderQuery && scenario === 'slow') await new Promise(resolve => setTimeout(resolve, 2000));
      let rows = table.filter(row => [...url.searchParams].every(([key, value]) => {
        if (key === 'deliveries.user_id') return tables.deliveries.some(d => d.order_id === row.id && d.user_id === value.slice(3));
        if (value.startsWith('eq.')) return String(row[key]) === value.slice(3);
        if (value.startsWith('in.(')) return value.slice(4, -1).split(',').includes(String(row[key]));
        return true;
      }));
      if (firstOrderQuery) rows = rows.filter(row => tables.deliveries.some(d => d.order_id === row.id));
      const sorts = url.searchParams.get('order')?.split(',') || [];
      rows.sort((a, b) => {
        for (const sort of sorts) {
          const [column, direction] = sort.split('.');
          const compared = String(a[column] || '').localeCompare(String(b[column] || ''));
          if (compared) return direction === 'desc' ? -compared : compared;
        }
        return 0;
      });
      if (url.searchParams.has('limit')) rows = rows.slice(0, Number(url.searchParams.get('limit')));
      result = req.headers.accept?.includes('vnd.pgrst.object') ? rows[0] ?? null : rows;
    }
  }
  res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(result));
}).listen(port, '127.0.0.1', () => console.log(`Fake Auth on http://127.0.0.1:${port}`));
