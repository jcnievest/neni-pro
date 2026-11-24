import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { handleCatalogPresentation, normalizeLogo } from '../server/catalog-presentation.js';
import { logoFileIssue, logoMime, safeLogoUrl, LOGO_MAX_BYTES } from '../src/lib/catalog-logo.js';
import { storageSchema } from './fixtures/storage-schema.mjs';
import endpoint from '../api/catalog-presentation.js';

const source = async (format = 'png', width = 900, height = 300) => sharp({ create: { width, height, channels: 4, background: '#127263' } }).toFormat(format).toBuffer();
const image = bytes => ({ type: logoMime(bytes), data: bytes.toString('base64') });

test('Vercel entry point rejects invalid configuration without leaking values or throwing', async () => {
  const names=['SUPABASE_URL','VITE_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
  const original=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  try {
    process.env.SUPABASE_SERVICE_ROLE_KEY='server-test-key-not-a-real-secret';
    process.env.VITE_SUPABASE_URL='invalid-environment-url';
    for(const value of [undefined,'invalid-server-url','ftp://example.test']) {
      if(value===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=value;
      const response=await endpoint.fetch(new Request('https://app.test/api/catalog-presentation',{method:'POST'}));
      assert.equal(response.status,503);
      const body=await response.text();
      assert.ok(!body.includes('server-test-key'));assert.ok(!body.includes('invalid-server-url'));
    }
    process.env.SUPABASE_URL=' https://test.supabase.co \n';
    assert.equal((await endpoint.fetch(new Request('https://app.test/api/catalog-presentation',{method:'POST'}))).status,401);
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.equal((await endpoint.fetch(new Request('https://app.test/api/catalog-presentation',{method:'POST'}))).status,503);
  } finally {
    for(const name of names){if(original[name]===undefined)delete process.env[name];else process.env[name]=original[name];}
  }
});

test('logo client allowlist, size, content signatures and safe legacy URLs', async () => {
  for (const format of ['png','jpeg','webp']) {
    const bytes = await source(format);
    assert.equal(logoFileIssue({ type: logoMime(bytes), size: bytes.length }), '');
  }
  for (const type of ['image/svg+xml','text/html','image/gif','application/pdf']) assert.ok(logoFileIssue({ type, size: 100 }));
  for (const size of [0,LOGO_MAX_BYTES+1]) assert.ok(logoFileIssue({type:'image/png',size}));
  assert.equal(logoMime(Buffer.from('<svg></svg>')), null);
  for (const url of ['javascript:alert(1)','data:image/svg+xml,evil','http://evil.test/a','broken']) assert.equal(safeLogoUrl(url),null);
  assert.equal(safeLogoUrl('https://example.test/logo.png'),'https://example.test/logo.png');
});

test('server decodes and strips metadata, preserves proportions, returns bounded WebP', async () => {
  for (const format of ['png','jpeg','webp']) {
    const input=await sharp(await source(format)).withMetadata({exif:{IFD0:{Artist:'Private metadata'}}}).toBuffer();
    const output=await normalizeLogo(image(input));const info=await sharp(output).metadata();
    assert.equal(info.format,'webp');assert.equal(info.width,512);assert.equal(info.height,171);
    assert.equal(info.exif,undefined);assert.ok(output.length<512*1024);
  }
  const small=await sharp(await normalizeLogo(image(await source('png',80,40)))).metadata();
  assert.equal(small.width,80);assert.equal(small.height,40);
});

test('server rejects disguised, malformed, oversized, corrupt and active content', async () => {
  const valid=image(await source());
  for(const input of [null,{...valid,type:'image/svg+xml'},{...valid,type:'image/jpeg'},
    {type:'image/png',data:Buffer.from('<svg onload="alert(1)"/>').toString('base64')},
    {type:'image/png',data:Buffer.from([137,80,78,71,13,10,26,10]).toString('base64')},
    {type:'image/png',data:'!invalid'},{type:'image/png',data:Buffer.alloc(LOGO_MAX_BYTES+1).toString('base64')},
    image(await source('png',5000,4000))]) await assert.rejects(normalizeLogo(input));
});

function fakeAdmin() {
  const userId=randomUUID(), other=randomUUID(), files=new Map(), profiles=new Map(), calls=[];
  let access=true, failSave=false;
  const storage={getPublicUrl:path=>({data:{publicUrl:`https://test.supabase.co/storage/v1/object/public/product-photos/${path}`}}),
    upload:async(path,bytes,options)=>{assert.ok(path.startsWith(`${userId}/catalog-logos/`));assert.equal(options.upsert,false);files.set(path,bytes);return {};},
    remove:async paths=>{paths.forEach(path=>{assert.ok(path.startsWith(`${userId}/catalog-logos/`));files.delete(path);});return {};}};
  const admin={auth:{getUser:async token=>({data:{user:token==='valid'?{id:userId}:null}})},storage:{from:()=>storage},
    from:()=>{let id;const q={select:()=>q,eq:(key,value)=>{assert.equal(key,'user_id');id=value;return q;},maybeSingle:async()=>({data:profiles.get(id)})};return q;},
    rpc:async(name,args)=>{calls.push([name,args]);assert.equal(args.p_user,userId);if(name==='catalog_access_allowed')return {data:access};
      if(failSave)return {error:{message:'fail'}};
      const current=profiles.get(userId)||{};const logo_url=args.p_replace_logo?args.p_logo_url:current.logo_url;
      profiles.set(userId,{...current,logo_url});return {data:{logo_url}};},
  };
  const request=(body,token='valid',headers={})=>new Request('https://app.test/api/catalog-presentation',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...headers},body:JSON.stringify({name:'Tienda',description:'Demo',...body})});
  return {admin,userId,other,files,profiles,calls,request,setAccess:v=>{access=v;},setFail:v=>{failSave=v;}};
}

test('HTTP authentication, account ownership, replacement, deletion and failed save cleanup', async () => {
  const f=fakeAdmin();const payload=image(await source());
  assert.equal((await handleCatalogPresentation(f.request({image:payload},'invalid'),f.admin)).status,401);
  f.setAccess(false);assert.equal((await handleCatalogPresentation(f.request({image:payload}),f.admin)).status,403);assert.equal(f.files.size,0);f.setAccess(true);
  const saved=await handleCatalogPresentation(f.request({image:payload,user_id:f.other}),f.admin);assert.equal(saved.status,200);
  const first=await saved.json();assert.ok(first.logo_url.includes(f.userId));assert.equal(f.files.size,1);
  const replaced=await (await handleCatalogPresentation(f.request({image:payload}),f.admin)).json();
  assert.notEqual(first.logo_url,replaced.logo_url);assert.equal(f.files.size,1);
  f.setFail(true);assert.equal((await handleCatalogPresentation(f.request({image:payload}),f.admin)).status,503);
  assert.equal(f.files.size,1);assert.equal(f.profiles.get(f.userId).logo_url,replaced.logo_url);f.setFail(false);
  assert.equal((await handleCatalogPresentation(f.request({removeLogo:true}),f.admin)).status,200);
  assert.equal(f.files.size,0);assert.equal(f.profiles.get(f.userId).logo_url,null);
  assert.equal((await handleCatalogPresentation(f.request({}),null)).status,503);
  assert.equal((await handleCatalogPresentation(f.request({image:payload},{},{'content-length':4000000}),f.admin)).status,401);
});

test('HTTP invalid payloads cannot write data or echo secrets', async () => {
  const f=fakeAdmin();
  for(const payload of [{name:'x'.repeat(121)},{description:'x'.repeat(301)},{image:image(await source()),removeLogo:true},{image:{type:'text/html',data:'ZXZpbA=='}}]) {
    const result=await handleCatalogPresentation(f.request(payload),f.admin);assert.equal(result.status,400);
  }
  assert.equal((await handleCatalogPresentation(f.request({},'valid',{'content-length':'4000000'}),f.admin)).status,413);
  assert.equal((await handleCatalogPresentation(new Request('https://app.test/api/catalog-presentation'),f.admin)).status,405);
  assert.ok(f.calls.every(([name])=>name==='catalog_access_allowed'));assert.equal(f.files.size,0);
});

test('presentation migration: storage boundaries, public projection, stable URL and atomic settings', {skip:!process.env.PGLITE_MODULE}, async t => {
  const {PGlite}=await import(process.env.PGLITE_MODULE);const db=new PGlite();
  const a=randomUUID(),b=randomUUID();
  const role=async(name,uid='')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec(`set role ${name}`);};
  const rows=async(sql,args=[]) => (await db.query(sql,args)).rows;
  const logoPath=`${a}/catalog-logos/${randomUUID()}.webp`;
  const logoUrl=`https://test.supabase.co/storage/v1/object/public/product-photos/${logoPath}`;
  const save=(uid=a,logo=logoUrl)=>rows('select save_catalog_presentation($1,$2,$3,true,$4)',[uid,'Nuevo nombre','Nueva descripción',logo]);
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;`);
    await db.exec(storageSchema);
    await db.exec((await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8')).replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";',''));
    await db.exec('create table subscriptions(user_id uuid primary key,status text,trial_end text);grant all on all tables in schema public to authenticated,service_role;grant select on settings,products to anon;');
    for(const file of ['20261026000000_order_tracking.sql','20261117000000_catalog_requests.sql','20261118000000_restore_owner_isolation.sql','20261119000000_seller_catalog_events.sql','20261122000000_catalog_presentation.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
    await rows('insert into auth.users(id) values($1),($2)',[a,b]);await rows("insert into subscriptions(user_id,status) values($1,'active'),($2,'active')",[a,b]);
    await rows("insert into settings(user_id,shop_name,catalog_slug,catalog_public,catalog_orders_enabled) values($1,'Original','enlace-original',false,true)",[a]);
    await rows("insert into payment_cards(user_id,holder_name,bank,clabe) values($1,'Titular privado','Banco privado','000000000000000000')",[a]);
    await t.test('authenticated sellers cannot bypass decoding or write/move files of another owner',async()=>{
      await role('authenticated',a);
      for(const path of [logoPath,`${b}/catalog-logos/${randomUUID()}.webp`,`${b}/product.jpg`])await assert.rejects(rows("insert into storage.objects(bucket_id,name,metadata) values('product-photos',$1,'{}')",[path]),/row-level security/);
      await rows("insert into storage.objects(bucket_id,name,metadata) values('product-photos',$1,'{}')",[`${a}/product.jpg`]);
      await assert.rejects(rows('update storage.objects set name=$1 where name=$2',[logoPath,`${a}/product.jpg`]),/row-level security/);
      await assert.rejects(save(),/permission denied/);await role('anon');await assert.rejects(save(),/permission denied/);
    });
    await t.test('valid server upload reuses logo_url and preserves URL, privacy, settings and bank data',async()=>{
      await role('service_role');
      await rows("insert into storage.objects(bucket_id,name,metadata) values('product-photos',$1,$2)",[logoPath,JSON.stringify({mimetype:'image/webp',size:2048})]);
      await save();
      const settings=(await rows('select * from settings where user_id=$1',[a]))[0];
      assert.equal(settings.catalog_slug,'enlace-original');assert.equal(settings.catalog_public,false);assert.equal(settings.catalog_orders_enabled,true);
      const card=(await rows('select * from payment_cards where user_id=$1',[a]))[0];assert.equal(card.clabe,'000000000000000000');assert.equal(card.logo_url,logoUrl);
      await role('anon');assert.equal((await rows("select get_public_catalog('enlace-original') as c"))[0].c,null);
      await role('authenticated',a);await rows('update settings set catalog_public=true where user_id=$1',[a]);
      await role('anon');const catalog=(await rows("select get_public_catalog('enlace-original') as c"))[0].c;
      assert.equal(catalog.settings.logo_url,logoUrl);assert.equal(catalog.settings.shop_name,'Nuevo nombre');assert.ok(!JSON.stringify(catalog).includes('Banco privado'));assert.ok(!JSON.stringify(catalog).includes('Titular privado'));
    });
    await t.test('foreign/missing references rejected and failed logo save rolls back name change',async()=>{
      await role('service_role');await assert.rejects(save(b),/Logotipo no válido/);
      assert.equal((await rows('select * from settings where user_id=$1',[b])).length,0);
      await assert.rejects(save(a,logoUrl.replace('.webp','-missing.webp')),/Logotipo no válido/);
      await role('authenticated',b);assert.equal((await rows('select logo_url from payment_cards where user_id=$1',[a])).length,0);
      assert.equal((await rows('update payment_cards set logo_url=null where user_id=$1 returning id',[a])).length,0);
      assert.equal((await rows('delete from storage.objects where name=$1 returning id',[logoPath])).length,0);
      await assert.rejects(rows('insert into payment_cards(user_id,logo_url) values($1,$2)',[b,logoUrl]),/Logotipo no válido/);
    });
    await t.test('remove is optional, fresh profile creation works, expired access stays blocked',async()=>{
      await role('service_role');await save(a,null);await save(b,null);
      const before=(await rows('select catalog_slug from settings where user_id=$1',[b]))[0].catalog_slug;await save(b,null);
      assert.equal((await rows('select catalog_slug from settings where user_id=$1',[b]))[0].catalog_slug,before);
      await rows("update subscriptions set status='inactive',trial_end='2020-01-01' where user_id=$1",[b]);
      await assert.rejects(save(b,null),/prueba gratuita/);
      await role('anon');assert.equal((await rows("select get_public_catalog('enlace-original') as c"))[0].c.settings.logo_url,null);
    });
    await t.test('new analytics names stay private and deduplicate in the existing table',async()=>{
      const key=randomUUID();await role('authenticated',a);
      for(const event of ['catalog_menu_opened','catalog_logo_uploaded','catalog_preview_opened','catalog_share_clicked']){
        for(let i=0;i<2;i++)assert.equal((await rows('select record_seller_catalog_event($1,$2) as ok',[event,key]))[0].ok,true);
      }
      assert.equal((await rows('select * from catalog_events')).length,4);await role('authenticated',b);assert.equal((await rows('select * from catalog_events')).length,0);
    });
  }finally{await db.close();}
});
