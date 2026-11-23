// Local-only disposable PostgreSQL fixture. Never deploy this server or its fake Auth.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { storageSchema } from './storage-schema.mjs';
import { handleCatalogPresentation } from '../../server/catalog-presentation.js';
const { PGlite } = await import(process.env.PGLITE_MODULE);
const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:5176';
const port = Number(process.env.PORT || 54331);
const owner = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
const ids = ['20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000004'];
let db;
const storedImages = new Map();
async function reset() {
  if (db) await db.close();
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,created_at timestamptz default now());
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated;`);
  await db.exec(storageSchema);
  storedImages.clear();
  const schema = (await readFile(new URL('../../supabase/schema.sql', import.meta.url), 'utf8')).replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', '');
  await db.exec(schema);
  await db.exec('create table subscriptions(user_id uuid primary key,status text,trial_end text); grant all on all tables in schema public to authenticated,service_role; grant select on settings,products to anon;');
  for (const name of ['20261026000000_order_tracking.sql','20261117000000_catalog_requests.sql','20261118000000_restore_owner_isolation.sql','20261119000000_seller_catalog_events.sql','20261122000000_catalog_presentation.sql']) {
    await db.exec(await readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8'));
  }
  await db.query('insert into auth.users(id) values($1),($2)', [owner, other]);
  await db.query("insert into subscriptions(user_id,status) values($1,'active'),($2,'active')", [owner,other]);
  await db.query("insert into settings(user_id,catalog_slug,shop_name,shop_description,whatsapp_phone) values($1,'demo','Tienda de prueba','Catálogo de demostración con datos ficticios','5512345678'),($2,'segunda','Segunda tienda','Demostración','5512345678')", [owner,other]);
  for (const [index,name,stock,made] of [[0,'Blusa rosa',2,false],[1,'Camisa agotada',0,false],[2,'Bolsa bajo pedido',null,true],[3,'Accesorio sin inventario',null,false]]) {
    await db.query('insert into products(id,user_id,name,price,cost,stock,made_to_order) values($1,$2,$3,100,20,$4,$5)', [ids[index],owner,name,stock,made]);
  }
  await db.query("insert into clients(user_id,name,phone) values($1,'Cliente ficticio','5511111111')",[owner]);
}
await reset();
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function session(email = 'demo@example.test') {
  const id=email === 'second@example.test' ? other : owner;
  const user={id,email,aud:'authenticated',role:'authenticated',created_at:new Date().toISOString(),email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{}};
  return { user,access_token:`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+86400})}.fake-local-signature`,refresh_token:id,expires_in:86400,token_type:'bearer' };
}
const allowedTables = new Set(['products','clients','orders','order_items','deliveries','payments','subscriptions','settings','payment_cards','catalog_order_requests','catalog_request_audit','catalog_events']);
const allowedRpc = new Set(['get_public_catalog','submit_catalog_request','get_catalog_request_receipt','get_catalog_request','respond_catalog_request','manage_catalog_request','record_catalog_event','record_seller_catalog_event','create_order_atomic','manage_order_tracking','get_public_order_tracking']);
const ident = value => { if(!/^[a-z_]+$/.test(value)) throw new Error('Invalid fixture identifier'); return `"${value}"`; };
// Exercise the real HTTP/image handler; only its Supabase transport is local/fake.
const admin = {
  auth: { getUser: async token => {
    try {
      const id=JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub;
      return { data: { user: token.endsWith('.fake-local-signature') && [owner,other].includes(id) ? {id} : null } };
    } catch { return {data:{user:null},error:new Error('Invalid token')}; }
  } },
  async rpc(name,args) {
    if (!['catalog_access_allowed','save_catalog_presentation'].includes(name)) throw new Error('Unexpected admin RPC');
    try {
      const keys=Object.keys(args);
      const result=await db.query(`select public.${ident(name)}(${keys.map((k,i)=>`${ident(k)}=>$${i+1}`).join(',')}) as value`,Object.values(args));
      return {data:result.rows[0].value};
    } catch(error) { return {error}; }
  },
  from(table) {
    if(table!=='payment_cards')throw new Error('Unexpected admin table');
    let uid;
    const query={select(){return query;},eq(key,value){if(key!=='user_id')throw new Error('Missing owner');uid=value;return query;},
      async maybeSingle(){try{return {data:(await db.query('select logo_url from payment_cards where user_id=$1',[uid])).rows[0]||null};}catch(error){return {error};}}};
    return query;
  },
  storage:{from(bucket){
    if(bucket!=='product-photos')throw new Error('Unexpected bucket');
    return {
      getPublicUrl:path=>({data:{publicUrl:`http://127.0.0.1:${port}/storage/v1/object/public/product-photos/${path}`}}),
      async upload(path,bytes,options){
        try {await db.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',[bucket,path,JSON.stringify({mimetype:options.contentType,size:bytes.length})]);storedImages.set(path,bytes);return {};}catch(error){return {error};}
      },
      async remove(paths){for(const path of paths){await db.query('delete from storage.objects where bucket_id=$1 and name=$2',[bucket,path]);storedImages.delete(path);}return {};},
    };
  }},
};
let queue=Promise.resolve();
createServer(async (req,res) => {
  res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version,accept-profile,content-profile,prefer,range,range-unit');
  res.setHeader('Access-Control-Allow-Methods','GET,HEAD,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Expose-Headers','Content-Range');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  let raw=''; for await(const chunk of req) raw+=chunk;
  const respond=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(req.method==='HEAD'?'':JSON.stringify(data));};
  queue=queue.then(async()=>{
    const url=new URL(req.url,'http://127.0.0.1'); const input=raw?JSON.parse(raw):{};
    if(url.pathname==='/test/reset'){await reset();respond(200,{ok:true});return;}
    if(url.pathname.startsWith('/storage/v1/object/public/product-photos/')){
      const image=storedImages.get(url.pathname.split('/product-photos/')[1]);
      res.writeHead(image?200:404,{'Content-Type':image?'image/webp':'text/plain'});res.end(image||'Not found');return;
    }
    if(url.pathname==='/api/catalog-presentation'){
      await db.exec('reset role; set role service_role');
      const request=new Request(`${origin}${url.pathname}`,{method:req.method,headers:req.headers,...(raw?{body:raw}:{})});
      const result=await handleCatalogPresentation(request,admin);respond(result.status,await result.json());return;
    }
    let uid='';
    try { const token=req.headers.authorization?.slice(7).split('.')[1]; if(token)uid=JSON.parse(Buffer.from(token,'base64url')).sub; } catch { /* Anonymous fixture visitor. */ }
    if(![owner,other].includes(uid))uid='';
    if(url.pathname.startsWith('/auth/')){
      if(url.pathname.endsWith('/token'))respond(input.password==='wrong-password'?400:200,input.password==='wrong-password'?{msg:'Invalid login credentials'}:session(input.email||(input.refresh_token===other?'second@example.test':undefined)));
      else if(url.pathname.endsWith('/user'))respond(uid?200:401,uid?session(uid===other?'second@example.test':undefined).user:{message:'Not authenticated'});
      else respond(200,{});return;
    }
    if(url.pathname.startsWith('/functions/')){respond(200,{ok:true});return;}
    await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]); await db.exec(`set role ${uid?'authenticated':'anon'}`);
    if(url.pathname.startsWith('/rest/v1/rpc/')){
      const name=url.pathname.split('/').pop();if(!allowedRpc.has(name))throw new Error('Unsupported fixture RPC');
      const keys=Object.keys(input);const values=keys.map(k=>typeof input[k]==='object'&&input[k]!==null?JSON.stringify(input[k]):input[k]);
      const args=keys.map((k,i)=>`${ident(k)} => $${i+1}`).join(',');
      const result=await db.query(`select public.${ident(name)}(${args}) as result`,values);
      respond(200,result.rows[0].result);return;
    }
    const table=url.pathname.split('/').pop();if(!allowedTables.has(table)){respond(404,{message:'Unknown fixture table'});return;}
    const params=[];const filters=[];
    for(const [key,value] of url.searchParams){
      if(['select','order','offset','limit'].includes(key)||key.includes('.'))continue;
      if(value.startsWith('eq.')){params.push(value.slice(3));filters.push(`${ident(key)}=$${params.length}`);}
      else if(value.startsWith('in.(')){const values=value.slice(4,-1).split(',');const placeholders=values.map(v=>{params.push(v);return `$${params.length}`;});filters.push(`${ident(key)} in (${placeholders.join(',')})`);}
    }
    if((url.searchParams.get('select')||'').includes('deliveries!inner'))filters.push('exists(select 1 from deliveries d where d.order_id=orders.id and d.user_id=orders.user_id)');
    const where=filters.length?` where ${filters.join(' and ')}`:'';
    let result;
    if(req.method==='PATCH'){
      const values=[...params];const sets=Object.entries(input).map(([k,v])=>{values.push(v);return `${ident(k)}=$${values.length}`;});
      result=await db.query(`update ${ident(table)} set ${sets.join(',')}${where} returning *`,values);
    }else if(req.method==='POST'){
      const entries=Array.isArray(input)?input:[input];let rows=[];
      for(const entry of entries){const keys=Object.keys(entry);const r=await db.query(`insert into ${ident(table)}(${keys.map(ident).join(',')}) values(${keys.map((_,i)=>`$${i+1}`).join(',')}) returning *`,Object.values(entry));rows.push(...r.rows);}result={rows};
    }else if(req.method==='DELETE'){result=await db.query(`delete from ${ident(table)}${where} returning *`,params);
    }else{
      const count=(await db.query(`select count(*) from ${ident(table)}${where}`,params)).rows[0].count;
      const limit=Math.min(Number(url.searchParams.get('limit')||500),500);const offset=Number(url.searchParams.get('offset')||0);
      const order=url.searchParams.get('order')?.split(',').map(s=>{const [key,dir]=s.split('.');return `${ident(key)} ${dir==='desc'?'desc':'asc'}`;}).join(',');
      result=await db.query(`select * from ${ident(table)}${where}${order?` order by ${order}`:''} limit ${limit} offset ${offset}`,params);
      res.setHeader('Content-Range',`${offset}-${Math.max(offset,offset+result.rows.length-1)}/${count}`);
    }
    // PostgREST serializes SQL date columns as YYYY-MM-DD, not JS Date timestamps.
    const dateColumns=new Set(['delivery_date','due_date','paid_date','offer_expiry']);
    const rows=result.rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,dateColumns.has(key)&&value instanceof Date?value.toISOString().slice(0,10):value])));
    respond(200,req.headers.accept?.includes('vnd.pgrst.object')?rows[0]??null:rows);
  }).catch(error=>{respond(400,{message:error.message,code:error.code||'LOCAL_FIXTURE'});});
}).listen(port,'127.0.0.1',()=>console.log(`Catalog fixture: http://127.0.0.1:${port}; demo@example.test / test-password; catalog slug: demo`));
