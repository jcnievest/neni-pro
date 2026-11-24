import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin=process.env.APP_ORIGIN || 'http://127.0.0.1:5178';
const api=process.env.TEST_API || 'http://127.0.0.1:54333';
for(const url of [origin,api])assert.equal(new URL(url).hostname,'127.0.0.1');
const screenshots=new URL('../docs/catalog-presentation/screenshots/',import.meta.url).pathname;
await mkdir(screenshots,{recursive:true});await fetch(`${api}/test/reset`,{method:'POST'});
const logo=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="300"><rect width="900" height="300" rx="20" fill="#127263"/><text x="450" y="205" fill="white" font-family="Arial" font-size="160" text-anchor="middle">DEMO</text></svg>')).png().toBuffer();
const replacement=await sharp({create:{width:100,height:200,channels:4,background:'#1f548c'}}).webp().toBuffer();
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],events=[];
async function page(email){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.route('**/*',r=>{
    if(r.request().url().includes('/rpc/record_seller_catalog_event'))events.push(r.request().postDataJSON());
    return [origin,api].includes(new URL(r.request().url()).origin)?r.continue():r.abort();
  });
  await context.addInitScript(()=>{
    Object.defineProperty(navigator,'share',{value:undefined,configurable:true});
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{window.copied=value;}},configurable:true});
  });
  const p=await context.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));
  if(email){await p.goto(`${origin}/login`);await p.getByLabel('Correo electrónico').fill(email);await p.getByLabel('Contraseña',{exact:true}).fill('test-password');await p.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await p.waitForURL('**/inicio');}
  return p;
}
async function shot(p,name,anchor){
  await p.waitForFunction(()=>!document.querySelector('[data-sonner-toast]'));
  await p.mouse.move(0,0);
  await p.evaluate(()=>{window.scrollTo(0,0);document.body.scrollTo(0,0);});
  if(anchor){
    await p.locator(`#${anchor}`).evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
    await p.waitForFunction(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.top>=0&&r.bottom<innerHeight;},anchor);
  }
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),p.url());
  await p.screenshot({path:`${screenshots}${name}.png`,animations:'disabled'});
}
const editor=p=>p.locator('form').filter({has:p.getByRole('heading',{name:'Personalizar catálogo',exact:true})});
async function save(p){
  const saved=p.waitForResponse(r=>r.url().endsWith('/api/catalog-presentation')&&r.request().method()==='POST'&&r.status()===200);
  await p.getByRole('button',{name:'Guardar cambios',exact:true}).click();await saved;
  await p.waitForFunction(()=>!document.querySelector('img[src^="blob:"]')&&[...document.querySelectorAll('button')].some(b=>b.textContent==='Guardar cambios'&&b.disabled));
}
try {
  const seller=await page('demo@example.test'),buyer=await page(),other=await page('second@example.test');
  await seller.getByRole('button',{name:'Abrir menú'}).click();
  await seller.getByRole('button',{name:'Cerrar menú'}).click();assert.equal(await seller.getByRole('menu').count(),0);
  await seller.getByRole('button',{name:'Abrir menú'}).click();
  assert.equal(await seller.getByRole('menuitem').first().innerText(),'Mi catálogo');await shot(seller,'menu-mobile');
  await seller.getByRole('menuitem',{name:'Mi catálogo',exact:true}).focus();await seller.keyboard.press('Enter');await seller.waitForURL('**/mi-catalogo');
  await seller.getByRole('heading',{name:'Personalizar catálogo'}).waitFor();
  assert.equal(await seller.getByRole('navigation',{name:'Navegación principal'}).getByRole('link').count(),4);
  await seller.getByRole('button',{name:'Personalizar',exact:true}).click();assert.equal(await seller.locator('#catalog-name').evaluate(el=>el===document.activeElement),true);
  await shot(seller,'catalog-admin-empty-mobile');
  await seller.locator('#catalog-logo').setInputFiles({name:'invalid.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});await seller.getByRole('alert').filter({hasText:'JPG, PNG o WebP'}).waitFor();
  await seller.locator('#catalog-logo').setInputFiles({name:'fake.png',mimeType:'image/png',buffer:Buffer.from('<script>bad</script>')});await seller.getByRole('alert').filter({hasText:'no corresponde'}).waitFor();
  await seller.locator('#catalog-logo').setInputFiles({name:'large.png',mimeType:'image/png',buffer:Buffer.alloc(2*1024*1024+1)});await seller.getByRole('alert').filter({hasText:'2 MB'}).waitFor();
  await seller.getByLabel('Nombre del negocio',{exact:true}).fill('Tienda de muestra');await seller.getByLabel('Descripción breve').fill('Ropa y accesorios. Catálogo de demostración.');
  await seller.locator('#catalog-logo').setInputFiles({name:'demo.png',mimeType:'image/png',buffer:logo});await seller.locator('img[src^="blob:"]').waitFor();
  await shot(seller,'logo-preview-mobile');await save(seller);
  const publicLink=await seller.getByRole('textbox',{name:'Enlace público del catálogo'}).inputValue();assert.equal(publicLink,`${origin}/catalogo?tienda=demo`);
  await seller.getByRole('button',{name:'Compartir mi catálogo'}).click();assert.equal(await seller.evaluate(()=>window.copied),publicLink);
  await seller.getByRole('button',{name:'Copiar enlace',exact:true}).click();assert.equal(await seller.evaluate(()=>window.copied),publicLink);
  assert.ok((await seller.getByRole('link',{name:'WhatsApp',exact:true}).getAttribute('href')).includes(encodeURIComponent(publicLink)));
  const popup=seller.waitForEvent('popup');await seller.getByRole('link',{name:'Ver mi catálogo',exact:true}).click();
  await (await popup).close();
  await buyer.goto(publicLink);await buyer.getByRole('heading',{name:'Tienda de muestra',exact:true}).waitFor();
  const publicLogo=buyer.getByRole('img',{name:'Logotipo de Tienda de muestra'});
  await publicLogo.evaluate(el=>el.decode());const firstUrl=await publicLogo.getAttribute('src');
  assert.equal(await publicLogo.evaluate(el=>el.naturalWidth),512);assert.equal(await publicLogo.evaluate(el=>getComputedStyle(el).objectFit),'contain');
  await buyer.route('**/storage/v1/object/public/product-photos/**',r=>r.abort());await buyer.reload();await buyer.getByLabel('Iniciales del negocio').waitFor();
  assert.equal(await buyer.getByRole('img',{name:/Logotipo/}).count(),0);
  await buyer.unroute('**/storage/v1/object/public/product-photos/**');await buyer.reload();await publicLogo.evaluate(el=>el.decode());
  await shot(buyer,'public-logo-mobile');await buyer.setViewportSize({width:1280,height:800});await shot(buyer,'public-logo-desktop');
  await seller.setViewportSize({width:1280,height:800});await shot(seller,'catalog-admin-desktop');
  await seller.getByRole('button',{name:'Abrir menú'}).click();await seller.getByRole('menuitem',{name:'Mi catálogo',exact:true}).click();assert.equal(await seller.getByRole('menu').count(),0);
  await seller.setViewportSize({width:320,height:740});await shot(seller,'catalog-admin-320');
  await seller.setViewportSize({width:390,height:844});
  await shot(seller,'catalog-sharing-mobile','share-title');
  await other.goto(`${origin}/mi-catalogo`);await other.getByRole('heading',{name:'Segunda tienda',exact:true}).first().waitFor();assert.equal(await other.getByRole('img',{name:/Logotipo/}).count(),0);
  // Failed save leaves both the existing public logo and unsaved draft intact.
  await seller.locator('#catalog-logo').setInputFiles({name:'replacement.webp',mimeType:'image/webp',buffer:replacement});await seller.locator('img[src^="blob:"]').waitFor();
  await seller.route('**/api/catalog-presentation',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"Error de prueba al guardar"}'}));
  await seller.getByRole('button',{name:'Guardar cambios',exact:true}).click();await seller.getByText('Error de prueba al guardar',{exact:true}).waitFor();
  await buyer.reload();await publicLogo.waitFor();assert.equal(await publicLogo.getAttribute('src'),firstUrl);
  await seller.unroute('**/api/catalog-presentation');await save(seller);
  await buyer.reload();await publicLogo.evaluate(el=>el.decode());assert.notEqual(await publicLogo.getAttribute('src'),firstUrl);
  assert.equal((await fetch(firstUrl)).status,404);
  await seller.getByRole('button',{name:'Eliminar logotipo',exact:true}).click();await save(seller);
  await buyer.reload();await buyer.getByLabel('Iniciales del negocio').waitFor();assert.equal(await buyer.getByRole('img',{name:/Logotipo/}).count(),0);
  await shot(buyer,'public-without-logo');
  // Legacy link redirects and general configuration remains in place.
  await seller.goto(`${origin}/mensajes#solicitudes-catalogo`);await seller.waitForURL('**/mi-catalogo#solicitudes-catalogo');await seller.waitForFunction(()=>document.activeElement?.id==='solicitudes-catalogo');
  await seller.getByRole('switch',{name:'Permitir que mis clientes soliciten pedidos desde mi catálogo'}).click();await seller.getByText('Guardado',{exact:true}).waitFor();
  await buyer.reload();await buyer.getByRole('button',{name:'Seleccionar',exact:true}).first().waitFor();
  await buyer.locator('div.bg-card').filter({has:buyer.getByText('Blusa rosa',{exact:true})}).getByRole('button',{name:'Seleccionar',exact:true}).click();
  await buyer.getByRole('button',{name:'Solicitar pedido (1)'}).click();await buyer.getByLabel('Nombre',{exact:true}).fill('Comprador ficticio');await buyer.getByLabel('WhatsApp',{exact:true}).fill('5500000001');await buyer.getByRole('checkbox').check();await buyer.getByRole('button',{name:'Revisar solicitud',exact:true}).click();await buyer.getByRole('button',{name:'Enviar solicitud de pedido',exact:true}).click();await buyer.getByText('¡Listo! Enviamos tu solicitud al vendedor.',{exact:true}).waitFor();
  await seller.goto(`${origin}/pedidos/solicitudes`);await seller.getByRole('link').filter({hasText:'Comprador ficticio'}).click();await seller.getByRole('button',{name:'Confirmar pedido',exact:true}).click();await seller.waitForURL('**/pedido/*');
  await seller.goto(`${origin}/mensajes`);await seller.getByRole('heading',{name:'Datos del negocio'}).waitFor();await seller.getByRole('heading',{name:'Contacto del negocio'}).waitFor();await seller.getByRole('heading',{name:'Tarjeta de cobro',exact:true}).waitFor();assert.equal(await seller.getByRole('heading',{name:'Solicitudes desde mi catálogo'}).count(),0);
  await seller.getByRole('switch',{name:'Vista oscura'}).click();
  await seller.waitForFunction(()=>document.documentElement.classList.contains('dark'));
  await seller.goto(`${origin}/mi-catalogo`);await seller.getByRole('heading',{name:'Personalizar catálogo'}).waitFor();
  await seller.waitForFunction(()=>document.documentElement.classList.contains('dark'));
  await shot(seller,'catalog-admin-dark');
  await seller.getByRole('switch',{name:'Publicar mi catálogo',exact:true}).click();await seller.getByText('Guardado',{exact:true}).waitFor();
  await seller.getByLabel('Descripción breve').fill('Descripción actualizada sin publicar');await save(seller);
  await buyer.goto(publicLink);await buyer.getByText('Este catálogo no está disponible.',{exact:true}).waitFor();
  assert.ok(events.every(e=>Object.keys(e).sort().join(',')==='p_event,p_visit'));
  for(const event of ['catalog_menu_opened','catalog_logo_uploaded','catalog_preview_opened','catalog_share_clicked'])assert.ok(events.some(e=>e.p_event===event),event);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,screenshots,checks:['menu mobile/desktop','keyboard','4 bottom links unchanged','legacy redirect','client image validation','real server decoding','optional logo/preview/replace/remove','save failure','original public URL','public logo/no logo','seller separation','share/WhatsApp','request and confirmation','general settings','private catalog stays private','analytics allowlist','320/390/1280/dark']}));
}catch(error){for(const c of browser.contexts())for(const p of c.pages())console.error(p.url(),(await p.locator('body').innerText()).slice(0,5000));throw error;}
finally{await browser.close();}
