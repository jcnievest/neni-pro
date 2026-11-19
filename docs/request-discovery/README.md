# Etapa 1: visibilidad de solicitudes

Implementacion en `codex/solicitudes-visibilidad-etapa-1`, basada en la version publicada `1360e60`. El usuario autorizo la publicacion el 19 de noviembre de 2026. El PR de esta etapa registra el resultado de la migracion, el despliegue y las comprobaciones finales. Las pruebas funcionales se hicieron con datos ficticios; no se crean pedidos ni se modifica la configuracion de vendedores reales para verificar la publicacion.

## Hallazgos de la inspeccion

- React 18, Vite, React Router, TanStack Query, Supabase y Sonner. Se conservan los componentes, colores, tipografia y estructura mobile-first.
- `Home.jsx` muestra Tu dia de ventas. Ya tenia un enlace de solicitudes, pero desaparecia sin pendientes y estaba antes del encabezado.
- `MobileNav.jsx` contiene Inicio, Pedidos, Cobros y Entregas. Se mantienen exactamente esas cuatro secciones.
- `Orders.jsx` consulta pedidos reales. Las rutas existentes `/pedidos/solicitudes` y `/pedidos/solicitudes/:id` corresponden a `OrderRequests.jsx` y `OrderRequestDetail.jsx`.
- Estados de solicitud: `pending`, `adjustment_pending`, `confirmed`, `rejected`, `cancelled`. La aceptacion del comprador devuelve un ajuste a `pending`. Solo confirmar inserta un pedido normal; stock, cobros y entregas se conservan en sus procesos actuales.
- Las lecturas llevan `user_id` y RLS. Las cuentas vencidas conservan las rutas de consulta y no pueden confirmar, modificar ni rechazar.
- El catalogo y la recepcion son configuraciones distintas: `catalog_public` y `catalog_orders_enabled`. Ninguna se cambia automaticamente.
- Ya existe un contador HEAD, invalidacion al gestionar solicitudes y sondeo cada 20 segundos. Se reutilizan, sin push ni servicios externos.
- La analitica de solicitudes es privada en `catalog_events`. Meta permanece excluido de las pantallas con datos de compradores.

## Comportamiento

### Inicio

Debajo del encabezado y antes de indicadores operativos aparece **Solicitudes por atender** si existen solicitudes con estado `pending`. Incluye el total real, descripcion y enlace directo **Revisar solicitudes**. La bienvenida de primer pedido se conserva debajo de las acciones principales para no ocultar los pendientes.

Si el total es cero, aparece una invitacion compacta. Con catalogo publico, slug y recepcion activos, permite compartir mediante el menu nativo o copiar el enlace. Si ambas capacidades fallan, muestra un enlace seleccionable; cancelar el menu nativo no produce un error. Si falta configuracion, lleva a `/mensajes#solicitudes-catalogo`, enfoca esa seccion y no activa nada por cuenta propia. Un catalogo privado requiere una accion expresa para publicarlo.

Carga/error no se interpretan como cero solicitudes. El error ofrece acceso a la bandeja, sin una invitacion engañosa de estado vacio.

### Pedidos

Se incorpora una navegacion visual de dos pestañas mediante enlaces accesibles:

- **Por confirmar**: `/pedidos/solicitudes`, prioriza `pending`.
- **Mis pedidos**: `/pedidos`, mantiene la captura manual y todos los pedidos convertidos, sus estados, referencias, importes y acciones. Esta sigue siendo la entrada al tocar Pedidos en la barra inferior; no se cambia su ruta ni la redireccion posterior al guardado manual.

La bandeja muestra comprador, fecha/hora, folio, productos, importe estimado, estado y accion Revisar solicitud. Un selector permite ver **Esperando al comprador** o **Todas, incluido historial**, sin agregar otra fila de pestañas. Filtro y pagina se conservan en la URL y al volver del detalle. Si una pagina queda fuera del total tras actualizar los datos, se vuelve a la ultima pagina valida.

**Definicion del contador:** solo `pending`. Los ajustes esperando aceptacion no suman, porque el vendedor aun no puede confirmarlos. Siguen visibles en su filtro y el historial; al aceptarlos el comprador vuelven a contar. Confirmadas, rechazadas y canceladas nunca suman. Las solicitudes no se incluyen en los indicadores de ventas.

Inicio, la navegacion de Pedidos y el badge inferior comparten `['catalog-request-count', user.id]`, cache, sondeo e invalidacion existentes. Al confirmar/rechazar/ajustar se invalidan los datos inmediatamente; cambios externos se reflejan con el sondeo o al recuperar foco. No hay mensajes emergentes repetitivos.

### Comprador

La accion principal dice **Solicitar pedido**. Tras guardar correctamente: **¡Listo! Enviamos tu solicitud al vendedor.** y **Tu pedido esta pendiente de confirmacion. El vendedor revisara la disponibilidad.** Se conservan consentimiento, revision, validaciones, recibo, mensajes de error y la aclaracion de que no se reserva inventario ni se procesan/verifican pagos.

## Archivos y componentes

| Area | Archivos |
| --- | --- |
| Inicio y pedidos | `src/pages/Home.jsx`, `Orders.jsx`, `OrderRequests.jsx`, `OrderRequestDetail.jsx` |
| Indicadores compartidos | `src/components/orders/OrderRequestsNotice.jsx`, `OrdersNavigation.jsx`, `src/hooks/usePendingRequests.js`, `src/api/catalog-requests.js` |
| Navegacion | `src/components/layout/MobileNav.jsx`, `TopBar.jsx` |
| Compartir/configurar | `src/components/catalog/CatalogInvitation.jsx`, `ShareCatalogButton.jsx`, `src/pages/QuickMessages.jsx` |
| Textos comprador | `src/pages/Catalog.jsx`, `ProductPublic.jsx`, `src/components/catalog/CatalogRequestForm.jsx` |
| Analitica | `src/lib/seller-catalog-analytics.js`, `seller-catalog-tracking.js`, `supabase/migrations/20261119000000_seller_catalog_events.sql` |
| Pruebas | `tests/request-discovery.test.mjs`, `request-discovery.browser.mjs`, `catalog-requests.test.mjs`, `catalog-requests.browser.mjs`, `fixtures/catalog-server.mjs` |

No se modificaron funciones SQL de stock, solicitudes, conversion, pagos ni suscripciones. No se agregaron dependencias ni archivos compilados. Se conservaron las eliminaciones preexistentes de capturas en `docs/campaign/screenshots` y el directorio local `supabase/.temp`, ajenos a esta etapa.

## Analitica

Se prepararon estos eventos en la tabla existente `catalog_events`:

| Evento | Disparador |
| --- | --- |
| `order_requests_entry_viewed` | Acceso visible en Inicio con consulta resuelta, o navegacion de Pedidos |
| `order_requests_opened` | Apertura de la bandeja, tambien mediante enlace directo |
| `order_request_review_started` | Detalle de una solicitud cargado correctamente y autorizado |
| `catalog_share_clicked` | Clic en compartir, copiar enlace/mensaje o WhatsApp del catalogo |

Cada evento se registra una vez por vendedor/sesion de pestaña, no una vez por render o sondeo. Recargas conservan un UUID aleatorio por evento y el servidor deduplica con la clave existente. Se separan cuentas; almacenamiento bloqueado utiliza memoria. Esto mide sesiones con actividad, **no numero de solicitudes revisadas ni compartidos completados**. Cerrar/cancelar el menu de compartir no deshace el clic.

El payload solo lleva nombre de evento y UUID aleatorio. El servidor obtiene el vendedor desde `auth.uid()`; no recibe nombres, telefonos, URL, folios, IDs de solicitudes, notas ni contenido de productos. Sin nuevo Pixel, proveedor o cambios al consentimiento. Fallos de medicion, incluida migracion aun no aplicada, no bloquean la interfaz.

La unica migracion nueva amplia la lista permitida y agrega `record_seller_catalog_event` autenticada, con `search_path` vacio, limite de 1000 eventos diarios por cuenta y sin permisos anonimos ni escrituras directas. Es necesaria para reutilizar la analitica privada: el RPC anterior solo admite eventos publicos y las rutas de solicitudes excluyen Meta. No agrega tablas ni cambia datos comerciales. Se valido en PostgreSQL local desechable. Para esta publicacion autorizada se revisaron las migraciones, la restriccion anterior y RLS del proyecto remoto antes de aplicar el SQL; no se aprovisiono staging remoto.

La migracion es compatible con el frontend anterior: si se necesita revertir solo esta etapa visual, puede restaurarse la version `1360e60` sin borrar eventos, desactivar RLS ni revertir las migraciones anteriores de solicitudes. Conservar los eventos ya registrados.

Ejemplo de consulta privada (RLS limita las filas al vendedor conectado):

```sql
select event_name, count(*) as sesiones_con_accion,
  count(distinct created_at::date) as dias_con_actividad
from public.catalog_events
where event_name in ('order_requests_entry_viewed','order_requests_opened',
  'order_request_review_started','catalog_share_clicked')
group by event_name;
```

## Verificacion

- 70 pruebas Node/PGlite aprobadas, cero fallos y cero omisiones: estados/cantidades, paginacion, aislamiento, deduplicacion, fallo de red/almacenamiento, permisos del RPC y regresiones previas.
- Recorrido Playwright de esta etapa aprobado: cero/una/varias solicitudes, activar manualmente, compartir y fallback, confirmacion/rechazo y actualizacion de badges, ajuste/aceptacion, historial, volver a la pagina correcta, dos vendedores aislados, prueba activa/vencida, catalogo privado y error de red sin falso estado vacio.
- Recorrido previo Playwright aprobado: envio perdido/reintento, conversion sin duplicidad, stock, pedido manual libre, plan/consulta de cobros y entregas, enlace de seguimiento y modo oscuro.
- Movil 320 y 390 px, escritorio 1280 px, navegacion por teclado y capturas. Se conserva el ancho de la aplicacion existente en escritorio. El tono `secondary-foreground` existente se usa para mejorar contraste de textos pequeños nuevos; no se cambian colores globales.
- Lint, typecheck, build a directorio temporal y `git diff --check` aprobados. Browserslist aviso de datos de compatibilidad antiguos; no se cambiaron dependencias ajenas a esta tarea.

Todo se ejecuto con base desechable y Auth ficticio en loopback. El navegador rechaza trafico externo. No se enviaron correos, mensajes, conversiones publicitarias ni cobros reales.

### Evidencia visual

- [Inicio con pendientes, movil](screenshots/home-pending-mobile.png)
- [Inicio, escritorio](screenshots/home-pending-desktop.png)
- [Sin pendientes / compartir](screenshots/home-share-mobile.png)
- [Recepcion desactivada](screenshots/home-disabled-mobile.png)
- [Bandeja movil](screenshots/requests-mobile.png)
- [Bandeja escritorio](screenshots/requests-desktop.png)
- [Modo oscuro](screenshots/requests-dark-mobile.png)
- [Historial](screenshots/requests-history-mobile.png)
- [Confirmacion al comprador](screenshots/buyer-sent-mobile.png)

## Validar antes de desplegar

Vista previa local: `http://127.0.0.1:5177/login`, cuenta ficticia `demo@example.test`, contraseña `test-password`. Segundo vendedor: `second@example.test`, misma contraseña. Catalogo ficticio: `http://127.0.0.1:5177/catalogo?tienda=demo`.

1. Entrar a Inicio; comprobar el acceso de solicitudes antes de los indicadores.
2. Abrir Por confirmar y revisar una solicitud. Confirmar/rechazar y comprobar que baja el contador; confirmar debe mostrar un unico pedido en Mis pedidos.
3. Modificar una solicitud; verla en Esperando al comprador. Aceptar desde su enlace privado y comprobar que vuelve a Por confirmar.
4. Probar historial, paginacion y volver del detalle. Entrar con el segundo vendedor: no debe ver datos del primero.
5. Sin pendientes, compartir el catalogo o abrir la configuracion. Desactivar la recepcion y comprobar que no aparece Solicitar pedido en el catalogo publico.
6. En staging, aplicar solo la migracion pendiente de esta etapa sobre el esquema vigente y repetir con cuentas ficticias. Validar los cuatro eventos con el vendedor conectado.
7. Probar Safari/iPhone y PWA instalada, especialmente menu nativo para compartir y regreso desde WhatsApp. Estos dispositivos fisicos no se probaron aqui.
8. Publicar solo despues de aprobacion expresa. El frontend no depende del RPC analitico para operar; si falta la migracion, no se mediran los eventos nuevos. No deshabilitar RLS para resolver problemas de permisos.

### Comandos reproducibles

Usar dos terminales para la vista previa, con los runtimes de pruebas externos ya disponibles; no instalar dependencias en produccion:

```sh
PORT=54332 APP_ORIGIN=http://127.0.0.1:5177 PGLITE_MODULE=file:///ruta/@electric-sql/pglite/dist/index.js node tests/fixtures/catalog-server.mjs
```

```sh
VITE_SUPABASE_URL=http://127.0.0.1:54332 VITE_SUPABASE_ANON_KEY=test-local-only npm run dev -- --host 127.0.0.1 --port 5177 --strictPort
```

```sh
npm run lint
npm run typecheck
npm run build -- --outDir /tmp/nenis-discovery-build
PGLITE_MODULE=file:///ruta/@electric-sql/pglite/dist/index.js node --experimental-vm-modules --test tests/*.test.mjs
APP_ORIGIN=http://127.0.0.1:5177 TEST_API=http://127.0.0.1:54332 PLAYWRIGHT_MODULE=file:///ruta/playwright/index.mjs node tests/request-discovery.browser.mjs
APP_ORIGIN=http://127.0.0.1:5177 TEST_API=http://127.0.0.1:54332 SCREENSHOTS_DIR=/tmp/nenis-discovery-regression/ PLAYWRIGHT_MODULE=file:///ruta/playwright/index.mjs node tests/catalog-requests.browser.mjs
```

Los recorridos de navegador reinician exclusivamente la base local ficticia. Ejecutarlos de forma secuencial. No ejecutar sin `PGLITE_MODULE` y presentar las pruebas SQL omitidas como aprobadas.
