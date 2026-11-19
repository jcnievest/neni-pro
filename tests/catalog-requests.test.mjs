import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { availabilityLabel, catalogPrice, quantityIssue, requestLink, whatsappLink, catalogSessionId } from '../src/lib/catalog-requests.js';

test('catalog prices, offer expiry and the three inventory modes', () => {
  assert.equal(catalogPrice({ price: 100, is_offer: true, offer_price: 0, offer_expiry: '2026-11-17' }, '2026-11-17'), 0);
  assert.equal(catalogPrice({ price: 100, is_offer: true, offer_price: 80, offer_expiry: '2026-11-16' }, '2026-11-17'), 100);
  assert.match(quantityIssue({ stock: 2 }, 4), /Disponible: 2/);
  assert.match(quantityIssue({ stock: 0 }, 1), /Disponible: 0/);
  assert.equal(quantityIssue({ stock: null }, 1000), '');
  assert.equal(quantityIssue({ made_to_order: true, stock: null }, 9), '');
  for (const quantity of [0, -1, 0.5, 1001, 'NaN']) assert.ok(quantityIssue({}, quantity));
  assert.match(availabilityLabel({ made_to_order: true }), /Bajo pedido/);
});

test('capability links and WhatsApp links cannot inject a different destination', () => {
  const token = randomUUID();
  assert.equal(requestLink(token, 'https://example.test'), `https://example.test/solicitud#${token}`);
  assert.throws(() => requestLink('javascript:alert(1)', 'https://example.test'));
  assert.equal(whatsappLink('123', 'x'), null);
  assert.equal(new URL(whatsappLink('5512345678', '<&>#')).hostname, 'wa.me');
  const store = new Map();
  const storage = { getItem: k => store.get(k), setItem: (k, v) => store.set(k, v) };
  const id = catalogSessionId('shop', 'visit', storage);
  assert.equal(catalogSessionId('shop', 'visit', storage), id);
  assert.notEqual(catalogSessionId('shop2', 'visit', storage), id);
});

test('catalog requests: PostgreSQL security, stock, idempotency and existing order modules', { skip: !process.env.PGLITE_MODULE }, async t => {
  const { PGlite } = await import(process.env.PGLITE_MODULE);
  const db = new PGlite();
  const owner = randomUUID(), other = randomUUID();
  const stock = randomUUID(), exhausted = randomUUID(), made = randomUUID(), unlimited = randomUUID(), hidden = randomUUID(), foreign = randomUUID();
  const query = async (sql, args = []) => (await db.query(sql, args)).rows;
  const role = async (name, uid = '') => {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid]);
    await db.exec(`set role ${name}`);
  };
  const admin = () => role('postgres');
  const seller = () => role('authenticated', owner);
  const guest = () => role('anon');
  const items = (id = stock, qty = 1, price = 100) => [{ product_id: id, quantity: qty, expected_unit_price: price }];
  const submit = async ({ key = randomUUID(), lines = items(), phone = '5512345678', consent = true, slug = 'demo', name = 'Cliente de prueba', website = '' } = {}) =>
    (await query('select public.submit_catalog_request($1,$2,$3,$4,$5,$6,$7,$8) as result', [slug, key, JSON.stringify(lines), name, phone, 'Prueba ficticia', consent, website]))[0].result;
  const lookup = async token => (await query('select public.get_catalog_request($1) as result', [token]))[0].result;
  const requestRow = async token => (await query('select * from public.catalog_order_requests where public_token=$1', [token]))[0];
  const manage = async (r, action, overrides = {}) => (await query('select public.manage_catalog_request($1,$2,$3,$4,$5,$6,$7) as result', [r.id, r.version, action, overrides.items ? JSON.stringify(overrides.items) : null, overrides.conditions ?? null, overrides.date ?? null, overrides.client ?? null]))[0].result;
  const respond = async (token, version, action) => (await query('select public.respond_catalog_request($1,$2,$3) as result', [token, version, action]))[0].result;
  const stockValue = async id => Number((await query('select stock from public.products where id=$1', [id]))[0].stock);
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, created_at timestamptz default now());
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to anon,authenticated;
      create schema storage;`);
    const schema = (await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8'))
      .replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', '').split('-- Storage bucket for product photos')[0];
    await db.exec(schema);
    await db.exec(`create table public.subscriptions(user_id uuid primary key, status text, expires_at text, trial_end text);
      grant all on all tables in schema public to authenticated;
      grant select on public.settings,public.products to anon;`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261026000000_order_tracking.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../supabase/migrations/20261117000000_catalog_requests.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../supabase/migrations/20261118000000_restore_owner_isolation.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../supabase/migrations/20261119000000_seller_catalog_events.sql', import.meta.url), 'utf8'));
    await query('insert into auth.users(id) values($1),($2)', [owner, other]);
    await query("insert into public.subscriptions(user_id,status) values($1,'active'),($2,'active')", [owner, other]);
    await query("insert into public.settings(user_id,catalog_slug,shop_name) values($1,'demo','Tienda ficticia'),($2,'other','Otra tienda')", [owner, other]);
    for (const [id, uid, name, count, madeToOrder, visible] of [[stock,owner,'Con stock',2,false,true],[exhausted,owner,'Agotado',0,false,true],[made,owner,'Bajo pedido',null,true,true],[unlimited,owner,'Sin control',null,false,true],[hidden,owner,'Oculto',5,false,false],[foreign,other,'Ajeno',5,false,true]]) {
      await query('insert into public.products(id,user_id,name,price,cost,stock,made_to_order,catalog_visible) values($1,$2,$3,100,20,$4,$5,$6)', [id,uid,name,count,madeToOrder,visible]);
    }
    await t.test('existing sellers start disabled; public projection excludes private fields', async () => {
      await guest();
      const catalog = (await query("select public.get_public_catalog('demo') as result"))[0].result;
      assert.equal(catalog.settings.catalog_orders_enabled, false);
      assert.equal(catalog.products.length, 4);
      assert.ok(catalog.products.every(p => !('cost' in p) && !('user_id' in p)));
      assert.ok(!('monthly_goal' in catalog.settings));
      assert.equal((await query('select * from products')).length, 0);
      await assert.rejects(submit(), /no está recibiendo/);
      await seller(); await query("update settings set catalog_orders_enabled=true where user_id=$1", [owner]);
    });
    let receipt;
    await t.test('guest submits without account; retry after lost response creates exactly one request and no reservation', async () => {
      await guest(); const key = randomUUID(); receipt = await submit({ key });
      assert.deepEqual(await submit({ key }), receipt);
      assert.deepEqual((await query('select get_catalog_request_receipt($1,$2) as result',['demo',key]))[0].result,receipt);
      assert.equal((await query('select get_catalog_request_receipt($1,$2) as result',['other',key]))[0].result,null);
      assert.equal((await query('select get_catalog_request_receipt($1,$2) as result',['demo',randomUUID()]))[0].result,null);
      assert.match(receipt.folio, /^SOL-[A-F0-9]{12}$/);
      await assert.rejects(query('select * from catalog_order_requests'), /permission denied/);
      const publicRow = await lookup(receipt.token);
      for (const field of ['id','user_id','buyer_name','buyer_phone','buyer_notes','order_id']) assert.ok(!(field in publicRow));
      await seller(); assert.equal(await stockValue(stock), 2);
      assert.equal((await query('select * from orders')).length, 0);
      assert.equal((await query('select * from catalog_order_requests')).length, 1);
      await guest(); await assert.rejects(submit({ key, name: 'Otros datos' }), /otros datos/);
    });
    await t.test('server validates consent, prices, quantities, visibility and product owner', async () => {
      await guest();
      for (const args of [{consent:false},{website:'spam'},{phone:'123'},{lines:items(stock,0)},{lines:items(stock,0.5)},{lines:items(stock,1001)},{lines:items(hidden)},{lines:items(foreign)},{lines:items(exhausted)},{lines:items(stock,3)},{lines:items(stock,1,0)}]) await assert.rejects(submit(args));
      await assert.rejects(query('select public.persist_order_atomic($1,$2,$3,$4)',[owner,randomUUID(),'{}','catalog']),/permission denied/);
      await assert.rejects(submit({lines:[...items(stock,2),...items(stock,1)]}),/stock/);
    });
    await t.test('turning off new requests preserves receipt recovery and existing proposals',async()=>{
      await guest();const key=randomUUID();const saved=await submit({key,lines:items(made),phone:'5500000011'});
      await seller();await query('update settings set catalog_orders_enabled=false where user_id=$1',[owner]);
      await guest();await assert.rejects(submit({lines:items(made)}),/no está recibiendo/);
      assert.deepEqual((await query('select get_catalog_request_receipt($1,$2) as result',['demo',key]))[0].result,saved);
      assert.equal((await lookup(saved.token)).status,'pending');
      await seller();await manage(await requestRow(saved.token),'reject');
      await query('update settings set catalog_orders_enabled=true where user_id=$1',[owner]);
    });
    await t.test('confirm produces normal order/items/delivery, balance and source; retries do not double decrement', async () => {
      await seller(); const r = await requestRow(receipt.token); const result = await manage(r, 'confirm');
      assert.deepEqual(await manage(r, 'confirm'), result);
      const o = (await query('select * from orders where id=$1', [result.order_id]))[0];
      assert.equal(o.source, 'catalog'); assert.equal(Number(o.total),100); assert.equal(Number(o.balance),100); assert.ok(o.reference_number);
      assert.equal((await query('select * from order_items where order_id=$1',[o.id])).length,1);
      assert.equal((await query('select * from deliveries where order_id=$1',[o.id])).length,1);
      assert.equal(await stockValue(stock),1);
      const events = await query("select event_name from catalog_events where event_key=$1",[r.id]);
      assert.equal(events.length,3);
      await guest(); await assert.rejects(respond(receipt.token,1,'cancel'), /cambió/);
    });
    await t.test('two requests for the last unit can be sent; concurrent confirmation allows only one', async () => {
      await guest(); const a = await submit({phone:'5511111111'}); const b = await submit({phone:'5522222222'});
      await seller(); assert.equal(await stockValue(stock),1);
      const ar=await requestRow(a.token), br=await requestRow(b.token);
      const results=await Promise.allSettled([manage(ar,'confirm'),manage(br,'confirm')]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
      assert.match(results.find(r=>r.status==='rejected').reason.message,/stock/);
      assert.equal(await stockValue(stock),0);
    });
    await t.test('made-to-order and uncontrolled products never require physical inventory', async () => {
      await guest(); const a=await submit({lines:[...items(made,10),...items(unlimited,30)],phone:'5533333333'});
      await seller(); const r=await requestRow(a.token); const result=await manage(r,'confirm');
      const o=(await query('select * from orders where id=$1',[result.order_id]))[0]; assert.equal(Number(o.total),4000);
      assert.equal((await query('select stock from products where id=$1',[made]))[0].stock,null);
      assert.equal((await query('select stock from products where id=$1',[unlimited]))[0].stock,null);
    });
    await t.test('seller adjusts products/conditions; buyer must accept the latest proposal', async () => {
      await guest(); const a=await submit({lines:items(unlimited),phone:'5544444444'});
      await seller(); let r=await requestRow(a.token);
      const adjustment=await manage(r,'adjust',{items:items(made,2),conditions:'Entrega en punto acordado',date:'2026-12-15'});
      assert.equal(adjustment.requires_acceptance,true); r=await requestRow(a.token);
      await assert.rejects(manage(r,'confirm'),/aceptar/);
      await guest(); await assert.rejects(respond(a.token,1,'accept'),/cambió/);
      assert.equal((await respond(a.token,2,'accept')).status,'pending');
      assert.equal((await respond(a.token,2,'accept')).status,'pending');
      await seller(); r=await requestRow(a.token); const result=await manage(r,'confirm');
      const o=(await query('select delivery_date::text from orders where id=$1',[result.order_id]))[0]; assert.equal(o.delivery_date,'2026-12-15');
    });
    await t.test('price changes at confirmation require acceptance; prices never come from the buyer', async () => {
      await guest(); const a=await submit({lines:items(unlimited),phone:'5555555555'});
      await seller(); await query('update products set price=120 where id=$1',[unlimited]); let r=await requestRow(a.token);
      assert.equal((await manage(r,'confirm')).requires_acceptance,true);
      assert.equal((await requestRow(a.token)).order_id,null);
      await guest(); assert.equal(Number((await lookup(a.token)).estimated_total),120); await respond(a.token,2,'accept');
      await seller(); r=await requestRow(a.token); await manage(r,'confirm');
    });
    await t.test('reject and cancel close proposals without touching stock or creating orders', async () => {
      await guest(); const a=await submit({lines:items(made),phone:'5566666666'}); const b=await submit({lines:items(made),phone:'5577777777'});
      await seller(); const before=(await query('select * from orders')).length; const r=await requestRow(a.token); await manage(r,'reject');
      await assert.rejects(manage(r,'confirm'),/cerrada/);
      await guest(); await respond(b.token,1,'cancel');
      await seller(); assert.equal((await query('select * from orders')).length,before); assert.equal(await stockValue(stock),0);
    });
    await t.test('RLS and every seller action isolate accounts; arbitrary client references are rejected', async () => {
      await guest(); const a=await submit({lines:items(made),phone:'5588888888'});
      await seller(); const r=await requestRow(a.token);
      await role('authenticated',other); assert.equal((await query('select * from catalog_order_requests')).length,0);
      for(const action of ['confirm','adjust','reject','cancel']) await assert.rejects(manage(r,action), /no disponible/);
      await admin(); const client=randomUUID(); await query("insert into clients(id,user_id,name,phone) values($1,$2,'Ajeno','5588888888')",[client,other]);
      await seller(); await assert.rejects(manage(r,'confirm',{client}),/Cliente no disponible/);
      assert.equal((await requestRow(a.token)).order_id,null);
      await query("insert into clients(id,user_id,name,phone) values($1,$2,'Cliente existente','5588888888')",[randomUUID(),owner]);
      const own=(await query('select id from clients'))[0].id;
      const result=await manage(r,'confirm',{client:own}); assert.equal((await query('select client_id from orders where id=$1',[result.order_id]))[0].client_id,own);
    });
    await t.test('spam quotas and operational event deduplication are enforced by the server', async () => {
      await guest(); for(let i=0;i<5;i++) await submit({lines:items(made),phone:'5599999999'});
      await assert.rejects(submit({lines:items(made),phone:'5599999999'}),/límite/);
      const visit=randomUUID(); for(let i=0;i<2;i++) await query("select record_catalog_event('demo',$1,'public_catalog_viewed')",[visit]);
      await query("select record_catalog_event('demo',$1,'order_request_confirmed')",[visit]);
      await seller(); const events=await query('select * from catalog_events where event_key=$1',[visit]); assert.equal(events.length,1); assert.equal(events[0].event_name,'public_catalog_viewed');
    });
    await t.test('manual orders share atomic stock and keep free text, payments, deliveries and manual totals', async () => {
      await seller(); await query('update products set stock=2 where id=$1',[stock]);
      const key=randomUUID(); const payload={client_name:'Venta manual',total:350,advance:100,delivery_date:'2026-12-01',items:[{product_id:stock,product_name:'Con stock',quantity:1,unit_price:0,unit_cost:20},{product_name:'Texto libre',quantity:1,unit_price:0}],payment_plan:[{amount:50,status:'pagado',due_date:'2026-12-01'},{amount:200,status:'pendiente',due_date:'2026-12-15'}]};
      const save=async value=>(await query('select create_order_atomic($1,$2) as id',[key,JSON.stringify(value)]))[0].id;
      const oid=await save(payload); assert.equal(await save(payload),oid); assert.equal(await stockValue(stock),1);
      const o=(await query('select * from orders where id=$1',[oid]))[0]; assert.equal(o.source,'manual'); assert.equal(Number(o.balance),200); assert.equal(Number(o.total),350);
      assert.equal((await query('select * from payments where order_id=$1',[oid])).length,2);
      assert.equal((await query('select * from deliveries where order_id=$1',[oid])).length,1);
      await assert.rejects(save({...payload,total:360}),/otros datos/);
    });
    await t.test('a later persistence failure rolls back stock and all partial rows', async () => {
      await seller(); const before=(await query('select * from orders')).length;
      const payload={client_name:'Fallará',total:100,items:[{product_id:stock,product_name:'Con stock',quantity:1,unit_price:100}],payment_plan:[{amount:100,due_date:'invalid-date'}]};
      await assert.rejects(query('select create_order_atomic($1,$2)',[randomUUID(),JSON.stringify(payload)]));
      assert.equal(await stockValue(stock),1); assert.equal((await query('select * from orders')).length,before);
      await assert.rejects(query('select create_order_atomic($1,$2)',[randomUUID(),JSON.stringify({...payload,payment_plan:[],items:[{product_id:stock,product_name:'Con stock',quantity:0.001,unit_price:100}]})]),/cantidades/);
      assert.equal(await stockValue(stock),1);
    });
    await t.test('expired accounts remain read-only; seven-day trial and active subscription rules are preserved', async () => {
      await admin(); await query("update auth.users set created_at=now()-interval '30 days' where id=$1",[owner]); await query("update subscriptions set status='inactive',trial_end=(now()-interval '1 day')::text where user_id=$1",[owner]);
      await guest(); await assert.rejects(submit({lines:items(made),phone:'5500000000'}),/no está recibiendo/);
      assert.equal((await query("select get_public_catalog('demo') as r"))[0].r.settings.catalog_orders_enabled,false);
      await seller(); assert.ok((await query('select * from catalog_order_requests')).length>0);
      await assert.rejects(query('select create_order_atomic($1,$2)',[randomUUID(),'{}']),/prueba gratuita/);
      await query('update settings set catalog_orders_enabled=false where user_id=$1',[owner]);
      await assert.rejects(query('update settings set catalog_orders_enabled=true where user_id=$1',[owner]),/prueba gratuita/);
      await admin(); await query('delete from subscriptions where user_id=$1',[owner]); await query('update auth.users set created_at=now() where id=$1',[owner]);
      assert.equal((await query('select catalog_access_allowed($1) as ok',[owner]))[0].ok,true);
    });
    await t.test('emergency pause and resume preserve saved data and require fresh seller opt-in',async()=>{
      await admin();
      const count=(await query('select count(*)::int as count from orders'))[0].count;
      await db.exec(await readFile(new URL('../supabase/rollbacks/20261117000000_pause_catalog_requests.sql',import.meta.url),'utf8'));
      await guest();await assert.rejects(submit({lines:items(made)}),/permission denied/);
      assert.ok(await lookup(receipt.token));
      await seller();await assert.rejects(query('update settings set catalog_orders_enabled=true where user_id=$1',[owner]),/pausadas/);
      const manual={client_name:'Durante pausa',total:50,items:[{product_name:'Manual',quantity:1,unit_price:50}]};
      await query('select create_order_atomic($1,$2)',[randomUUID(),JSON.stringify(manual)]);
      await admin();
      await db.exec(await readFile(new URL('../supabase/rollbacks/20261117000000_resume_catalog_requests.sql',import.meta.url),'utf8'));
      assert.equal((await query('select count(*)::int as count from orders'))[0].count,count+1);
      assert.equal((await query('select catalog_orders_enabled from settings where user_id=$1',[owner]))[0].catalog_orders_enabled,false);
      await seller();await query('update settings set catalog_orders_enabled=true where user_id=$1',[owner]);
      await guest();assert.ok((await submit({lines:items(made),phone:'5500000022'})).folio);
    });
    await t.test('seller discovery events reuse private analytics with server ownership and deduplication', async () => {
      const visit = randomUUID();
      const record = event => query('select record_seller_catalog_event($1,$2) as ok', [event, visit]);
      await guest(); await assert.rejects(record('order_requests_opened'), /permission denied/);
      await seller();
      for (const event of ['order_requests_entry_viewed','order_requests_opened','order_request_review_started','catalog_share_clicked']) {
        assert.equal((await record(event))[0].ok, true);
        await record(event);
      }
      assert.equal((await record('order_request_confirmed'))[0].ok, false);
      assert.equal((await record(null))[0].ok, false);
      assert.equal((await query('select * from catalog_events where event_key=$1', [visit])).length, 4);
      await role('authenticated', other);
      assert.equal((await query('select * from catalog_events where event_key=$1', [visit])).length, 0);
      await record('order_requests_opened');
      const own = await query('select * from catalog_events where event_key=$1', [visit]);
      assert.equal(own.length, 1); assert.equal(own[0].user_id, other);
      assert.deepEqual(Object.keys(own[0]).sort(), ['created_at','event_key','event_name','user_id']);
      await assert.rejects(query("insert into catalog_events(user_id,event_name,event_key) values($1,'order_requests_opened',$2)", [owner, randomUUID()]), /permission denied/);
    });
  } finally { await db.close(); }
});
