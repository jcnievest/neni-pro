// Uses an isolated Chrome profile and rejects every non-loopback request.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:5176';
const api = process.env.TEST_API || 'http://127.0.0.1:54331';
for (const url of [origin,api]) assert.equal(new URL(url).hostname,'127.0.0.1','Never run this test on a real backend.');
await fetch(`${api}/test/reset`,{method:'POST'});
const browser=await chromium.launch({channel:'chrome',headless:true});
const screenshots=new URL('../docs/catalog-requests/screenshots/',import.meta.url).pathname;
await mkdir(screenshots,{recursive:true});
const errors=[];
async function context(viewport){
  const ctx=await browser.newContext({viewport});
  await ctx.route('**/*',route=>[origin,api].includes(new URL(route.request().url()).origin)?route.continue():route.abort());
  const page=await ctx.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));return page;
}
async function fits(page){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`Horizontal overflow: ${page.url()}`);}
async function capture(page,name){
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.screenshot({path:`${screenshots}${name}.png`,animations:'disabled'});
}
try{
  const buyer=await context({width:390,height:844});
  const seller=await context({width:1280,height:800});
  await buyer.goto(`${origin}/catalogo?tienda=demo`);
  await buyer.getByText('Blusa rosa',{exact:true}).waitFor();
  assert.equal(await buyer.getByRole('button',{name:'Seleccionar',exact:true}).count(),0,'Disabled catalog retains Contactar only');
  await seller.goto(`${origin}/login`);
  await seller.getByLabel('Correo electrónico').fill('demo@example.test');
  await seller.getByLabel('Contraseña',{exact:true}).fill('test-password');
  await seller.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await seller.waitForURL('**/inicio');
  await seller.goto(`${origin}/mensajes`);
  const toggle=seller.getByRole('switch',{name:'Permitir que mis clientes soliciten pedidos desde mi catálogo'});
  await toggle.click();await seller.getByText('Guardado',{exact:true}).waitFor();
  await buyer.reload();await buyer.getByRole('button',{name:'Seleccionar',exact:true}).first().waitFor();
  const card=name=>buyer.locator('div.bg-card').filter({has:buyer.getByText(name,{exact:true})});
  assert.ok(await card('Camisa agotada').getByRole('button',{name:'Seleccionar'}).isDisabled());
  await fits(buyer);await capture(buyer,'catalog-mobile');
  await buyer.setViewportSize({width:320,height:740});await fits(buyer);await buyer.setViewportSize({width:390,height:844});
  await card('Blusa rosa').getByRole('button',{name:'Seleccionar'}).click();
  await card('Bolsa bajo pedido').getByRole('button',{name:'Seleccionar'}).click();
  await buyer.getByRole('button',{name:'Revisar selección (2)'}).click();
  await buyer.getByLabel('Nombre',{exact:true}).fill('Comprador ficticio');
  await buyer.getByLabel('WhatsApp',{exact:true}).fill('5512345678');
  await buyer.getByLabel('Observaciones (opcional)').fill('Prueba local, sin datos reales.');
  await buyer.getByRole('checkbox').check();
  await buyer.getByRole('button',{name:'Revisar solicitud',exact:true}).click();
  await buyer.getByRole('heading',{name:'Revisa tu solicitud'}).waitFor();
  await buyer.waitForFunction(()=>document.activeElement?.textContent==='Revisa tu solicitud' && document.querySelector('[role="dialog"]').scrollTop===0);
  await buyer.setViewportSize({width:320,height:740});await fits(buyer);await buyer.setViewportSize({width:390,height:844});
  assert.equal(await buyer.getByRole('dialog').count(),1);
  await fits(buyer);await capture(buyer,'request-review-mobile');
  await buyer.route('**/rpc/submit_catalog_request',async route=>{await route.fetch();await route.abort('failed');});
  await buyer.getByRole('button',{name:'Enviar solicitud de pedido',exact:true}).click();
  await buyer.getByRole('link',{name:'Consultar solicitud',exact:true}).waitFor();
  const followLink=await buyer.getByRole('link',{name:'Consultar solicitud',exact:true}).getAttribute('href');
  assert.ok(followLink.includes('/solicitud#'));
  await buyer.unroute('**/rpc/submit_catalog_request');
  await buyer.getByRole('link',{name:'Consultar solicitud',exact:true}).click();
  await buyer.getByText('Por confirmar',{exact:true}).waitFor();
  await fits(buyer);
  await seller.goto(`${origin}/pedidos`);
  await seller.getByText('1 por revisar',{exact:true}).waitFor();
  await seller.getByRole('link',{name:/Solicitudes recibidas/}).click();
  await seller.getByRole('link').filter({hasText:'Comprador ficticio'}).click();
  await seller.getByRole('heading',{name:'Comprador ficticio'}).waitFor();
  await capture(seller,'request-seller-desktop');
  await seller.getByRole('button',{name:'Modificar',exact:true}).click();
  // Both request lines use server-sorted product IDs; the stock product is first in this fixture.
  await seller.getByLabel('Cantidad',{exact:true}).first().fill('2');
  await seller.getByLabel('Condiciones para el comprador').fill('Entrega en punto acordado.');
  await seller.getByLabel('Fecha propuesta de entrega').fill('2026-12-15');
  await seller.getByRole('button',{name:'Guardar propuesta',exact:true}).click();
  await seller.getByText('Ajuste pendiente',{exact:true}).waitFor();
  assert.ok(await seller.getByRole('button',{name:'Confirmar pedido',exact:true}).isDisabled());
  await buyer.reload();await buyer.getByRole('button',{name:'Aceptar ajuste'}).click();
  await buyer.getByText('Por confirmar',{exact:true}).waitFor();
  await seller.reload();await seller.getByRole('button',{name:'Confirmar pedido',exact:true}).click();
  await seller.waitForURL('**/pedido/*');
  await seller.getByText('Comprador ficticio',{exact:true}).waitFor();
  await seller.getByRole('button',{name:'Crear enlace de seguimiento'}).click();
  await seller.getByLabel('Enlace de seguimiento').waitFor();
  await seller.setViewportSize({width:390,height:844});await fits(seller);await capture(seller,'confirmed-order-mobile');
  await buyer.reload();await buyer.getByText('Confirmada',{exact:true}).waitFor();
  await capture(buyer,'request-status-mobile');
  await seller.goto(`${origin}/cobros`);await seller.getByText('Comprador ficticio',{exact:true}).waitFor();await fits(seller);
  await seller.goto(`${origin}/entregas`);await seller.getByText('Comprador ficticio',{exact:true}).waitFor();await fits(seller);
  // Existing manual free-text entry still uses the normal three-step UI.
  await seller.goto(`${origin}/pedidos/nuevo`);
  await seller.getByPlaceholder('Escribe el nombre del cliente...').fill('Venta manual ficticia');
  await seller.getByRole('button',{name:'Continuar como "Venta manual ficticia"'}).click();
  await seller.getByRole('button',{name:/Siguiente/}).click();
  await seller.getByPlaceholder('Producto o descripción').fill('Producto escrito libremente');
  await seller.getByPlaceholder('Precio $').fill('150');
  await seller.getByRole('button',{name:/Siguiente/}).click();
  await seller.getByRole('button',{name:/Guardar pedido/}).click();
  await seller.waitForURL('**/pedidos');
  await seller.getByText('Venta manual ficticia',{exact:true}).waitFor();
  await seller.goto(`${origin}/mensajes`);
  await seller.getByRole('switch',{name:'Vista oscura'}).click();
  await seller.waitForFunction(()=>document.documentElement.classList.contains('dark'));
  await seller.goto(`${origin}/pedidos/solicitudes`);
  await seller.getByRole('tab',{name:'Todas',exact:true}).click();
  await seller.getByRole('link').filter({hasText:'Comprador ficticio'}).click();
  await seller.getByRole('heading',{name:'Comprador ficticio'}).waitFor();
  await fits(seller);await capture(seller,'request-seller-dark-mobile');
  await buyer.goto(`${origin}/catalogo?tienda=demo`);
  await buyer.getByText('Blusa rosa',{exact:true}).waitFor();
  assert.ok(await card('Blusa rosa').getByRole('button',{name:'Seleccionar'}).isDisabled());
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,scenarios:['disabled catalog','seller opt-in','guest selection','stock limits','review and consent','lost response recovery','pending counter','seller adjustment','buyer acceptance','confirmed normal order','existing order tracking','Cobros','Entregas','manual free-text order','mobile 320/390','desktop 1280','dark mode'],screenshots}));
}catch(error){
  console.error('BROWSER ERRORS',errors);
  for(const context of browser.contexts())for(const page of context.pages()){
    console.error(`PAGE ${page.url()}\n${(await page.locator('body').innerText()).slice(0,6000)}`);
    console.error(await page.evaluate(()=>({focus:document.activeElement?.outerHTML,scroll:document.querySelector('[role="dialog"]')?.scrollTop})));
  }
  throw error;
}finally{await browser.close();}
