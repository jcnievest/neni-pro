# Solicitudes desde el catalogo

Publicacion autorizada por el usuario el 18 de noviembre de 2026. La migracion y el frontend se publican coordinadamente; la recepcion sigue deshabilitada por defecto. El PR de publicacion registra el despliegue y sus comprobaciones.

## Inspeccion previa

- React 18/Vite, React Router, TanStack Query, Supabase Auth/PostgREST/Postgres y Sonner.
- `/catalogo?tienda=slug` y `/producto/:id?tienda=slug` son publicos. `settings.catalog_public` publica la tienda; no habia publicacion individual ni variantes.
- `stock IS NULL` ya significa sin control de inventario. Stock numerico descuenta al crear el pedido, no al entregarlo. No hay reservas ni devolucion automatica por cancelacion.
- `createOrder` descontaba stock mediante comparacion y actualizacion desde el navegador, antes de insertar orders, order_items, payments y deliveries. El rollback podia sobrescribir cambios concurrentes y el guardado parcial no era atomico.
- Pedidos usan clientes opcionales y productos opcionales; el texto libre debe mantenerse. Cobros/entregas leen las mismas tablas.
- RLS separa datos por `auth.uid()`. Las politicas publicas antiguas exponian filas completas de productos/settings. Las nuevas lecturas publicas usan una proyeccion RPC, sin costo, propietario o metas internas.
- La suscripcion se lee de `subscriptions`, pero su DDL no esta en el repositorio. Se conservaran los estados y fechas reconocidos por `src/lib/access.js`; staging debe confirmar ese contrato. Prueba de siete dias y precios sin cambios.
- Notificaciones: Sonner y consultas TanStack; no hay bandeja/push. MailerLite se utiliza para altas, no para notificar pedidos. No se agregara correo ni WhatsApp automatico.
- Analitica: Pixel existente y hitos privados en Supabase. No hay gestor de consentimiento; se excluyen las pantallas con datos de compradores del Pixel. Los eventos de esta funcion se guardan en Supabase, sin nombres/telefonos ni proveedores nuevos.

## Decisiones

- Solicitudes son propuestas, no un segundo sistema de ventas. Al confirmar se insertan las tablas normales mediante el mismo guardado atomico que usaran los pedidos manuales.
- Stock nulo conserva su significado. Solo se agrega `made_to_order` para distinguir bajo pedido y `catalog_visible` para publicar productos. No se inventa un sistema de variantes; cada variante debe ser un producto separado identificado por su nombre.
- Ajustes requieren aceptacion por enlace privado. No se infiere aceptacion de un mensaje de WhatsApp.
- Un numero no verificado nunca vincula automaticamente a un cliente. El vendedor podra elegir una referencia de su propia lista al confirmar.
- Cancelar/rechazar una solicitud sin confirmar no toca inventario. Tras convertirla, se gestiona el pedido normal; se conserva la regla preexistente de no devolver stock automaticamente.
- Limites de piloto: 20 productos diferentes, cantidades enteras 1–1000, 5 solicitudes por telefono/tienda/dia y 100 por tienda/hora. No equivalen a proteccion contra ataques distribuidos; evaluar captcha/gateway antes de ampliar el piloto.

## Arquitectura implementada

1. `get_public_catalog` devuelve solo los campos publicos de la tienda y sus productos visibles. La activacion se cruza con el acceso comercial en el servidor.
2. El comprador selecciona productos, revisa cantidades/importes, deja nombre y WhatsApp y autoriza el contacto. La seleccion y un UUID de intento se conservan en sessionStorage; no se guardan contactos ahi.
3. `submit_catalog_request` valida consentimiento, limites, publicacion, pertenencia, disponibilidad y precio vigente. El importe enviado solo detecta cambios de precio; el servidor calcula los importes reales. Una solicitud no modifica stock, pedidos, pagos ni entregas.
4. El UUID de intento hace idempotente el envio, incluso si la respuesta HTTP se pierde. `get_catalog_request_receipt` permite recuperar el folio/enlace sin repetir el pedido. El folio no sirve como credencial: el enlace lleva un UUID aleatorio en el fragmento, no en la ruta ni en query parameters.
5. El vendedor recibe un contador en Inicio/Pedidos y una bandeja paginada, consultada cada 20 segundos. Puede revisar, ajustar, rechazar, cancelar o contactar por un enlace `wa.me`. No se envia ningun mensaje automaticamente.
6. Cada ajuste genera una version. El comprador debe aceptar esa version en su enlace privado. Si cambian el precio, nombre o modalidad de un producto antes de confirmar, el servidor genera otra propuesta; no convierte silenciosamente una propuesta distinta.
7. `manage_catalog_request` bloquea la solicitud y los productos, valida acceso/propiedad/aceptacion y llama a `persist_order_atomic`. Este mismo guardado se usa desde `createOrder` para pedidos manuales. Inserta `orders`, `order_items`, `payments` cuando hay plan y `deliveries` dentro de una sola transaccion.
8. Los productos con stock numerico se bloquean por ID y descuentan una sola vez. Las cantidades repetidas se agregan. Stock nulo no se descuenta. Cualquier error revierte todos los inserts y descuentos. `order_creation_keys` impide repetir la conversion o el guardado manual con el mismo intento.

El pedido convertido tiene `source = 'catalog'`; el manual usa `manual`. Sus cobros y entregas se gestionan en las pantallas existentes. El anticipo de una solicitud confirmada es cero: no se infieren pagos. Desactivar la recepcion impide nuevas solicitudes, pero permite terminar las existentes si el vendedor conserva acceso.

## Cambios de base de datos

Migracion nueva: `supabase/migrations/20261117000000_catalog_requests.sql`.

| Cambio | Uso |
| --- | --- |
| `settings.catalog_orders_enabled`, default false | Activacion por vendedor |
| `products.made_to_order`, default false | Bajo pedido, exige stock nulo |
| `products.catalog_visible`, default true | Publicacion individual |
| `orders.source`, default manual | Origen del pedido |
| `catalog_order_requests` | Propuesta, contacto autorizado, version, consentimiento y pedido resultante |
| `catalog_request_audit` | Historial de acciones/versiones y propuestas |
| `catalog_events` | Metricas operativas privadas sin nombres, telefonos ni contenido del pedido |
| `order_creation_keys` | Idempotencia del guardado compartido |

Las tablas nuevas tienen RLS. Solo el propietario puede leer solicitudes, actividad y eventos. No admiten escrituras directas de anon/authenticated; los cambios pasan por funciones con `search_path` vacio, privilegios explicitos y validaciones de propietario. Las funciones internas no son ejecutables por clientes. Se eliminan dos politicas publicas de lectura completa (`products_public_read`, `settings_public_read`) y se reemplazan por la proyeccion RPC. No se eliminan filas existentes ni se modifican precios o suscripciones.

## Activacion y uso

1. Vendedor con prueba/suscripcion activa: **Personalizar negocio > Mi tienda > Solicitudes desde mi catalogo**.
2. Activar **Permitir que mis clientes soliciten pedidos desde mi catalogo**. No habilita automaticamente un catalogo privado.
3. En Productos elegir disponibilidad: con inventario, bajo pedido o sin control. Elegir si se muestra en catalogo. Para existentes, stock numerico conserva control y stock nulo conserva ausencia de control.
4. Compartir el enlace existente `/catalogo?tienda=...`.
5. Abrir **Pedidos > Solicitudes recibidas**. Confirmar o modificar; si se modifica, compartir el enlace privado y esperar la aceptacion. Vincular un cliente existente es opcional y requiere seleccion del vendedor.

El enlace de solicitud permite consultar productos/total/condiciones, aceptar ajustes y cancelar una propuesta abierta. No muestra nombre, WhatsApp, notas privadas del comprador, datos bancarios ni identificadores internos de pedido/vendedor. Debe compartirse solo con el comprador. Despues de confirmar, la gestion de pagos/entrega queda en el pedido normal y su sistema de seguimiento preexistente; la pantalla de solicitud no replica esos estados.

## Archivos

| Area | Archivos |
| --- | --- |
| Persistencia y API | migracion nueva, `src/api/entities.js`, `src/api/catalog-requests.js`, `src/lib/catalog-requests.js` |
| Comprador | `src/pages/Catalog.jsx`, `ProductPublic.jsx`, `CatalogRequestStatus.jsx`, `src/components/catalog/CatalogRequestForm.jsx`, `CatalogPrivacy.jsx` |
| Vendedor | `src/pages/OrderRequests.jsx`, `OrderRequestDetail.jsx`, `Orders.jsx`, `Home.jsx`, `NewOrder.jsx`, `QuickMessages.jsx`, `src/components/orders/OrderRequestsNotice.jsx`, `src/components/products/ProductForm.jsx` |
| Rutas y privacidad | `src/App.jsx`, `src/components/AccessGate.jsx`, `src/pages/Privacidad.jsx`, `index.html`, `vercel.json`, `src/lib/campaign-analytics.js` |
| Pruebas | `tests/catalog-requests.test.mjs`, `catalog-settings.test.mjs`, `catalog-requests.browser.mjs`, `catalog-concurrency.native.mjs`, `fixtures/catalog-server.mjs`, `campaign-analytics.test.mjs` |
| Operacion | este documento, `supabase/rollbacks/20261117000000_pause_catalog_requests.sql` y `20261117000000_resume_catalog_requests.sql` |

No se instalaron dependencias de aplicacion ni se editaron archivos compilados. Las eliminaciones previas en `docs/campaign/screenshots` y los archivos locales de `supabase/.temp` no son parte de esta funcionalidad.

## Analitica y privacidad

Se reutiliza Supabase para eventos propios, sin agregar Pixel, proveedor, correo o integracion. En catalogo, producto, solicitud y bandeja/detalle de solicitudes se evita cargar el Pixel; si ya estaba cargado por navegacion SPA, se revoca su consentimiento. No se concede consentimiento automaticamente al salir. Esto puede reducir medicion de Meta durante esa sesion, deliberadamente para no exponer datos del comprador. Las conversiones del catalogo se cuentan en `catalog_events`, no en Meta.

- `public_catalog_viewed`, `catalog_product_selected`, `order_request_started`: una vez por evento/tienda/sesion de pestana. Son visitantes aproximados, no personas unicas. Se miden solo con recepcion habilitada. Maximo 10,000 eventos por tienda/24 horas.
- `order_request_submitted`, `order_request_confirmed`, `order_request_rejected`, `order_request_converted`: insertados por el servidor en la misma transaccion que la accion, una vez por solicitud/evento. No dependen del navegador del vendedor.
- El evento solo contiene propietario, nombre de evento, clave de deduplicacion y fecha. No contiene nombres, telefonos, IP, navegador, nombres de producto, importes ni notas.
- Las solicitudes y auditorias si contienen datos necesarios para atender el pedido y tienen acceso privado por vendedor. No se mandan a plataformas analiticas.

Consultas de lectura para un entorno autorizado (el propietario autenticado ve solo sus filas por RLS):

```sql
select event_name, count(*) as eventos
from public.catalog_events
where created_at >= now() - interval '30 days'
group by event_name order by event_name;

select source, count(*) as pedidos
from public.orders
where created_at >= now() - interval '30 days'
group by source;

-- Uso recurrente: vendedores con conversiones en al menos dos dias distintos.
select user_id, count(*) as pedidos_catalogo,
  count(distinct (created_at at time zone 'America/Mexico_City')::date) as dias_activos
from public.catalog_events
where event_name = 'order_request_converted'
  and created_at >= now() - interval '30 days'
group by user_id
having count(distinct (created_at at time zone 'America/Mexico_City')::date) >= 2;
```

## Pruebas locales

El servidor `tests/fixtures/catalog-server.mjs` usa PostgreSQL embebido (PGlite), aplica los SQL reales y simula solo Auth y un subconjunto de PostgREST. No usa credenciales de produccion. El navegador rechaza todas las conexiones ajenas a los dos origenes de loopback y usa perfiles desechables. `/test/reset` existe solo en este servidor de prueba y vacia su base en memoria.

Prerequisitos: Node, Chrome y PGlite/Playwright disponibles en herramientas de prueba externas al proyecto. Las variables `PGLITE_MODULE` y `PLAYWRIGHT_MODULE` aceptan una URL `file:///.../index.js` o `index.mjs`. Sin `PGLITE_MODULE` los tests SQL se saltan; un resultado con skip NO valida la migracion.

Terminal 1:

```sh
PGLITE_MODULE=file:///ruta/externa/@electric-sql/pglite/dist/index.js node tests/fixtures/catalog-server.mjs
```

Terminal 2:

```sh
VITE_SUPABASE_URL=http://127.0.0.1:54331 VITE_SUPABASE_ANON_KEY=test-local-only npm run dev -- --host 127.0.0.1 --port 5176 --strictPort
```

Terminal 3:

```sh
npm run lint
npm run typecheck
npm run build -- --outDir /tmp/nenis-catalog-build
PGLITE_MODULE=file:///ruta/externa/@electric-sql/pglite/dist/index.js node --experimental-vm-modules --test tests/*.test.mjs
PLAYWRIGHT_MODULE=file:///ruta/externa/playwright/index.mjs node tests/catalog-requests.browser.mjs
```

Vendedor ficticio: `demo@example.test` / `test-password`, en `http://127.0.0.1:5176/login`. Otro vendedor aislado: `second@example.test` / misma clave. Comprador: `http://127.0.0.1:5176/catalogo?tienda=demo`. La tienda comienza con recepcion desactivada; activar desde Personalizar negocio. No usar cuentas reales. La prueba de navegador reinicia la base ficticia al comenzar y deja pedidos ficticios al terminar.

Cobertura: invitado sin cuenta, tres modalidades, agotados, cantidad agregada, no reserva, confirmacion normal, reintentos, ajuste/aceptacion versionada, cambio de precio, rechazo/cancelacion, RLS entre vendedores, cliente ajeno, spam, eventos sin duplicados, fallo intermedio con rollback, pedidos manuales de texto libre con plan de pagos, Cobros/Entregas, expiracion de prueba, pausa/reactivacion, fallo de red despues del guardado, foco de revision y anchos 320/390/1280. Capturas en `docs/catalog-requests/screenshots`.

Resultado local del 18 de noviembre de 2026: **64 pruebas aprobadas, cero fallos y cero pruebas omitidas**. `lint`, `typecheck`, compilacion y `git diff --check` aprobados. El recorrido Playwright completo tambien paso, incluyendo enlace de seguimiento preexistente y vista oscura. Se inspeccionaron las capturas de catalogo, revision movil, detalle del vendedor, solicitud confirmada y pedido normal. La compilacion solo aviso que la base de compatibilidad de Browserslist esta desactualizada; no se actualizaron dependencias ajenas a la tarea.

**Concurrencia adicional verificada para publicar:** `tests/catalog-concurrency.native.mjs` paso contra PostgreSQL 17.11 desechable con dos conexiones independientes. La prueba observo bloqueo real mediante `pg_blocking_pids`, valido la ultima unidad entre dos solicitudes y entre pedido manual/solicitud, y reintento una confirmacion sin duplicarla. Se ejecuto con `EMBEDDED_POSTGRES_MODULE` apuntando a `embedded-postgres` instalado fuera del repositorio. El cluster se detuvo al terminar. Esto complementa PGlite, que serializa una conexion. No reemplaza Safari/iOS/PWA fisico, correo ni un recorrido con usuarios reales de Supabase.

Preflight remoto de lectura: PostgreSQL 17.6; estructura de tablas/politicas y migraciones previas coincidentes. `subscriptions` tiene `status` y `trial_end` timestamptz; cero usuarios con filas de suscripcion duplicadas. No se leyeron ni modificaron contactos/pedidos reales para probar. La API no devolvio respaldos fisicos disponibles ni PITR; se guardo una instantanea privada del esquema afectado fuera del repositorio. Es respaldo de esquema, no una copia de los datos. La migracion agrega estructura sin borrar filas y limita a cinco segundos la espera por bloqueos.

## Procedimiento de despliegue

El usuario autorizo publicar esta rama. Se reviso el esquema productivo en modo lectura y se verificaron las escrituras con datos ficticios en bases locales aisladas. No se aprovisiono un proyecto Supabase de staging. Mantener las comprobaciones siguientes como procedimiento para futuros despliegues; no usar cuentas de clientes para probar.

1. Crear/usar un proyecto Supabase de staging sin datos reales. Verificar version del esquema, aplicar las migraciones anteriores que falten y comparar la tabla `subscriptions` real con `catalog_access_allowed`. Confirmar estados, nombres de campos, unicidad por usuario y fechas con/sin hora. La comprobacion falla cerrada si la tabla no existe o las fechas son invalidas; no saltarse esta comprobacion para probar.
2. Revisar `pg_policies` de `products` y `settings`: si existen otras politicas anonimas fuera del repo, retirarlas/restringirlas antes del piloto. Verificar que anon no puede leer contactos, costos, solicitudes, auditoria o metas internas.
3. Respaldar/exportar el esquema y tomar un respaldo recuperable. Aplicar **solo** `20261117000000_catalog_requests.sql` sobre el esquema previo correcto. No volver a ejecutar `supabase/schema.sql` ni mezclarlo con migraciones ya aplicadas.
4. Configurar una vista previa con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` de staging. Nunca usar service-role en Vite ni reutilizar automaticamente las variables de produccion de una preview Vercel.
5. Repetir la matriz de pruebas con anon real y dos vendedores ficticios. Dos conexiones independientes deben intentar confirmar distintas solicitudes de una sola unidad; esperar un pedido, stock cero, otra solicitud pendiente. Repetir una confirmacion y perder/reintentar una respuesta de envio. Probar tambien confirmacion contra un pedido manual concurrente.
6. Probar en Safari/iPhone, PWA instalada y escritorio, incluyendo cuentas con prueba activa/vencida y suscripcion. Verificar los enlaces en WhatsApp sin enviar mensajes reales ni realizar cobros.
7. Coordinar migracion + frontend en una ventana de publicacion autorizada. La nueva app necesita los RPC antes de funcionar; el frontend antiguo usa lecturas publicas directas y guardado de stock desde JS. Por eso NO es compatible mantener PWA/clientes antiguos operando durante el cambio. Pedir cierre/recarga de la PWA, verificar el bundle nuevo y detener guardados durante la transicion. No anunciar un cambio sin interrupcion.
8. Solo despues de validar staging y recibir autorizacion, desplegar el SQL y frontend al proyecto correcto. No habilitar solicitudes masivamente. Hacer piloto con cinco vendedores que activen la opcion expresamente y medir errores, pendientes y conversiones.

No se adjunta una URL de staging porque no se aprovisiono ni desplego un entorno remoto para esta tarea.

## Reversion segura

Pausa funcional, sin borrar columnas, solicitudes, auditoria, pedidos, pagos ni stock:

```sh
psql "$DATABASE_URL_DEL_ENTORNO_CONFIRMADO" -v ON_ERROR_STOP=1 -f supabase/rollbacks/20261117000000_pause_catalog_requests.sql
```

Apaga la recepcion de todas las tiendas, impide reactivarla y revoca el envio publico/eventos de visita. Conserva el catalogo de lectura, los pedidos manuales atomicos, los enlaces de solicitudes existentes y su resolucion por el vendedor. No revierte una venta ni devuelve stock.

Para reanudar despues de corregir el problema:

```sh
psql "$DATABASE_URL_DEL_ENTORNO_CONFIRMADO" -v ON_ERROR_STOP=1 -f supabase/rollbacks/20261117000000_resume_catalog_requests.sql
```

Restablece privilegios/validacion original, pero deja todas las tiendas desactivadas hasta un nuevo opt-in. Ambos scripts se probaron en base desechable.

No hacer rollback del frontend a una version que desconozca `get_public_catalog` y `create_order_atomic`, ni restaurar politicas de exposicion publica de filas completas. La reversion soportada conserva el nuevo contrato y pausa la funcion; una eliminacion fisica del esquema requiere exportacion y un proyecto aparte de retiro de datos, no es un paso automatico.

## Pendientes antes del piloto

- Contratos/politicas reales revisados y concurrencia multiconexion local verificada. Sigue pendiente el recorrido de extremo a extremo con cuentas ficticias en staging y dispositivos fisicos, como se indica arriba.
- Revisar con el responsable del negocio los avisos, periodo de conservacion y proceso de eliminacion de contactos/solicitudes. No se borra informacion ni se inventa una politica de retencion. El aviso general preexistente sobre cookies de publicidad necesita reconciliarse con el Pixel ya instalado; esta funcion no agrega consentimiento publicitario ni garantiza cumplimiento legal.
- Sin variantes estructuradas, reservas, pagos automaticos, email/push, WhatsApp API ni devolucion automatica de stock. No se anuncian esas funciones.
- La validacion de fechas de acceso sin hora usa America/Mexico_City; el cliente preexistente usa la zona local del dispositivo. Verificar diferencias en el limite del dia antes de incluir vendedores en otras zonas.
- Los limites por tienda/telefono y honeypot son apropiados para un piloto controlado, no una defensa DDoS ni una verificacion de identidad/numero. Un enlace privado puede ser reenviado; no autentica a una persona.
- El simulador anterior `tests/fixtures/auth-server.mjs` no representa el nuevo guardado atomico. Usar el servidor de catalogo descrito aqui para probar esta rama.
