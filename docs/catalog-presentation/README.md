# Mi catalogo: acceso e identidad del negocio

Implementacion local en `codex/mi-catalogo-identidad`, basada en `68b6b54`.
El usuario autorizo la publicacion el 22 de noviembre de 2026. Esta documentacion
describe la implementacion y las pruebas locales; el PR registra el resultado
final de la migracion y del despliegue. No se modifican datos de clientes reales
para comprobar la publicacion.

## Inspeccion y decisiones

- React/Vite, React Router, TanStack Query, Sonner, Supabase y Vercel existentes.
- Menu: `TopBar.jsx`. Se agrega Mi catalogo como primera opcion con icono Store. Las cuatro opciones de navegacion inferior no cambian.
- Configuracion anterior: `QuickMessages.jsx` en `/mensajes`. Nombre y descripcion ya existen en `settings.shop_name` y `settings.shop_description`; se reutilizan sin crear campos paralelos.
- Existe `payment_cards.logo_url`, pero no tenia cargador ni presentacion. Se reutiliza exclusivamente ese campo: no se publica la tarjeta ni sus datos bancarios, ni se modifica su nombre/titular/cuenta.
- Ya existe el bucket publico `product-photos`, con carpetas por usuario. No se crea otro servicio ni bucket.
- URL publica: `getCatalogUrl(settings.catalog_slug)` y RPC `get_public_catalog`. Ningun slug existente cambia.
- Solicitudes: mismos campos `catalog_public` y `catalog_orders_enabled`, mismos servicios y reglas de confirmacion, precios e inventario.

## Interfaz

`/mi-catalogo` permite ver el catalogo, personalizar nombre/descripcion/logotipo, compartir por el menu nativo, copiar el enlace o abrir WhatsApp. Mantiene los ajustes de recepcion y contacto del catalogo. Cancelar una seleccion no sube nada; la imagen se guarda solo al pulsar Guardar cambios. Hay preview local y acciones de reemplazo/eliminacion.

El enlace `/mensajes#solicitudes-catalogo` redirige a `/mi-catalogo#solicitudes-catalogo` y enfoca la seccion. Inicio apunta al nuevo acceso. `/mensajes` conserva apariencia, datos y contacto generales, tarjeta de cobro y plantillas; nombre/descripcion/telefono siguen siendo los mismos datos compartidos con el catalogo.

El encabezado publico muestra imagen con `object-contain`, nombre y descripcion existentes. Tiene dimensiones estables de 64 px y alternativa con iniciales/icono cuando falta imagen, es invalida o falla la descarga. Se mantiene la referencia discreta a Nenis Pro. Un catalogo privado solo tiene preview autenticada y no habilita compartir hasta publicarse expresamente.

Durante la prueba movil se encontro un contenedor de notificaciones vacio que interceptaba los clics del menu. Se agrego `pointer-events-none` a sus dos envolturas; las notificaciones conservan `pointer-events-auto`. No se cambio el diseño del menu.

## Imagenes y permisos

- JPG, PNG y WebP, hasta 2 MB; firma de archivo, MIME y decodificacion validados en cliente y servidor. SVG/HTML/GIF, archivos corruptos, falsos MIME y exceso de pixeles son rechazados.
- El endpoint Node de Vercel `/api/catalog-presentation` usa **sharp ya instalado**. Decodifica con limite de 16 megapixeles, rechaza imagenes multipagina, aplica orientacion, reduce a 512 x 512 sin recortar/ampliar, elimina metadatos y vuelve a codificar a WebP (maximo 512 KB). No hay dependencias nuevas del proyecto.
- Archivo final: `product-photos/<usuario-autenticado>/catalog-logos/<uuid-nuevo>.webp`. Nunca se usa el nombre del archivo proporcionado ni un ID de usuario enviado por el navegador.
- El servidor valida el JWT mediante Supabase Auth y el acceso mediante la funcion existente `catalog_access_allowed`. La clave administrativa solo existe en servidor.
- La vista previa revelo una URL VITE de Supabase invalida, que el cliente anterior suplia con su fallback. Se configura `SUPABASE_URL` explicita para el servidor; el endpoint devuelve 503 controlado si la configuracion falta o es invalida, sin revelar valores.
- Politicas restrictivas impiden escrituras directas de anon/authenticated en ese prefijo, incluso movimientos/UPDATE. El resto de fotos de productos conserva sus permisos. El servidor escribe usando service_role solo despues de validar y decodificar.
- El guard de `logo_url` exige un objeto WebP existente, del mismo usuario y dentro del limite de tamaño. Referencias anteriores sin cambios se conservan. El catalogo solo recibe `logo_url`, no columnas bancarias.
- Nombre, descripcion y referencia se guardan atomicamente mediante `save_catalog_presentation`, accesible solo a service_role. No toca el resto de campos comerciales. Un fallo SQL no deja nombre guardado con imagen fallida.
- Reemplazar/eliminar retira la referencia al guardar; despues se intenta limpiar el archivo anterior de esta carpeta, nunca archivos ajenos/legacy/productos. Si una respuesta se pierde, la limpieza comprueba primero que la imagen no este referenciada. Fallos de limpieza no revierten un guardado correcto; pueden dejar un archivo huerfano para mantenimiento.
- Cada reemplazo tiene URL de imagen nueva; el enlace del catalogo permanece. Cache de imagen de 1 hora. El catalogo abierto refresca datos cada 30 segundos o al volver a cargar, como antes. Las copias CDN antiguas pueden durar su TTL tras eliminar, por lo que los logotipos son imagenes publicas, no documentos privados.

## Base de datos

Una migracion pendiente: `supabase/migrations/20261122000000_catalog_presentation.sql`.
Sin columnas/tablas nuevas ni borrado de datos existentes:

1. Tres politicas restrictivas solo para el prefijo de logotipos.
2. Guard de referencias en `payment_cards.logo_url` y RPC atomico autenticado desde servidor.
3. Proyeccion publica existente ampliada exclusivamente con `logo_url`.
4. Allowlist de eventos privados ampliada con `catalog_menu_opened`, `catalog_logo_uploaded`, `catalog_preview_opened`. Reutiliza `catalog_share_clicked`.

Eventos deduplicados por vendedor/evento/sesion de pestaña como en la etapa anterior. Solo se envian nombre de evento y UUID aleatorio; subida se mide despues del guardado correcto, no al elegir archivo. No incluyen nombre comercial, telefono, archivo, URL o contenido de pedidos. La nueva ruta reutiliza `CatalogPrivacy` y queda excluida del Pixel/campañas.

## Archivos

| Area | Archivos |
| --- | --- |
| Navegacion y compartir | `src/App.jsx`, `src/components/layout/TopBar.jsx`, `src/components/catalog/CatalogInvitation.jsx`, `src/components/catalog/ShareCatalogButton.jsx` |
| Administracion/publico | `src/pages/MyCatalog.jsx`, `src/pages/QuickMessages.jsx`, `src/pages/Catalog.jsx`, `src/components/catalog/CatalogIdentity.jsx` |
| Imagen/API | `src/lib/catalog-logo.js`, `src/api/catalog-presentation.js`, `server/catalog-presentation.js`, `api/catalog-presentation.js`, `vercel.json` |
| Eventos/privacidad | `src/lib/seller-catalog-analytics.js`, `src/lib/campaign-analytics.js`, `index.html` |
| Interferencia del menu | `src/components/ui/toast.jsx` |
| Apariencia existente | `src/components/AppTheme.jsx`: la ruta nueva respeta el modo oscuro del dispositivo |
| DB | `supabase/migrations/20261122000000_catalog_presentation.sql` |
| Pruebas | `tests/catalog-presentation.test.mjs`, `tests/catalog-presentation.browser.mjs`, `tests/catalog-branding.vite.mjs`, `tests/fixtures/storage-schema.mjs`, `tests/fixtures/catalog-server.mjs`; regresiones catalog-requests/request-discovery y campaign |

## Verificacion local

- 82 pruebas Node/PGlite aprobadas, cero fallos/omisiones: archivos y transformacion, HTTP y auth, configuracion del endpoint Vercel, RLS con dos vendedores, aislamiento de referencias, atomicidad, enlace estable, privacidad y regresion comercial.
- Playwright de personalizacion: menu a primer clic, teclado, subir/reemplazar/eliminar, errores y reintentos, preview, dos vendedores, catalogo privado, enlace anterior, compartir/WhatsApp, envio y confirmacion de solicitud, configuracion general, 320/390/1280 px y modo oscuro.
- Playwright de solicitudes: precios/stock, consentimiento, recuperacion de envio, modificacion y aceptacion, conversion sin duplicidad, cobros, entregas, pedido manual y seguimiento.
- Playwright de visibilidad: contadores, filtros, paginacion, historial, aislamiento entre vendedores y acceso al vencer la prueba.
- `npm run lint`, `npm run typecheck` y compilacion Vite aprobados. Build fuera del repositorio; sin cambios de archivos compilados. Advertencia no bloqueante: base Browserslist antigua, no se actualizaron dependencias.
- Pruebas de servidor usan el handler y decodificador reales; Auth/Storage HTTP son adaptadores ficticios y la base PostgreSQL es desechable. No simulan la infraestructura de Vercel/CDN.
- Browser rechaza trafico externo. Sin cuentas, correos, mensajes, pedidos, cobros ni eventos publicitarios reales.

Capturas ficticias:

- [Menu movil](screenshots/menu-mobile.png)
- [Administracion movil](screenshots/catalog-admin-empty-mobile.png)
- [Vista previa de imagen](screenshots/logo-preview-mobile.png)
- [Compartir y solicitudes](screenshots/catalog-sharing-mobile.png)
- [Administracion escritorio](screenshots/catalog-admin-desktop.png)
- [Modo oscuro](screenshots/catalog-admin-dark.png)
- [Catalogo publico movil](screenshots/public-logo-mobile.png)
- [Catalogo publico escritorio](screenshots/public-logo-desktop.png)
- [Sin logotipo](screenshots/public-without-logo.png)

## Probar antes de publicar

Vista local: http://127.0.0.1:5178/login
Cuenta ficticia `demo@example.test` / `test-password`; segunda `second@example.test`, misma contraseña.

1. Abrir menu > Mi catalogo; comprobar Ver / Personalizar / Compartir.
2. Subir JPG/PNG/WebP, guardar, abrir catalogo publico. Cambiar logo/nombre y comprobar que el enlace es el mismo. Eliminar y confirmar iniciales.
3. Probar archivo invalido y error de red: no debe perderse la imagen guardada.
4. Abrir `/mensajes#solicitudes-catalogo`; habilitar solicitudes explicitamente y completar una solicitud desde el catalogo. Confirmarla desde Pedidos.
5. Revisar `/mensajes`: apariencia, contacto, tarjeta y plantillas siguen disponibles.

Reproduccion (dependencias de pruebas fuera del repositorio):

```sh
PORT=54333 APP_ORIGIN=http://127.0.0.1:5178 PGLITE_MODULE=file:///ruta/@electric-sql/pglite/dist/index.js node tests/fixtures/catalog-server.mjs
VITE_SUPABASE_URL=http://127.0.0.1:54333 VITE_SUPABASE_ANON_KEY=test-local-only npm run dev -- --config tests/catalog-branding.vite.mjs --host 127.0.0.1 --port 5178 --strictPort
PGLITE_MODULE=file:///ruta/@electric-sql/pglite/dist/index.js node --experimental-vm-modules --test tests/*.test.mjs
APP_ORIGIN=http://127.0.0.1:5178 TEST_API=http://127.0.0.1:54333 PLAYWRIGHT_MODULE=file:///ruta/playwright/index.mjs node tests/catalog-presentation.browser.mjs
```

Ejecutar los recorridos secuencialmente: cada uno reinicia solo la base local ficticia.

## Pendientes de despliegue, sin ejecutar

1. Preparar un proyecto Supabase de prueba con las migraciones anteriores y aplicar alli la nueva migracion. Repetir pruebas con dos cuentas ficticias y el servicio real de Storage.
2. Configurar en el entorno **servidor** de Vercel `SUPABASE_URL` (o el `VITE_SUPABASE_URL` existente) y `SUPABASE_SERVICE_ROLE_KEY` del mismo proyecto. **Nunca** usar prefijo `VITE_` para la clave administrativa, publicarla ni pegarla en el chat. Vercel ejecuta el handler Node de `/api`; la regla SPA excluye `/api/`.
3. Probar preview Vercel: autenticacion real, limites de archivo, permisos, reemplazo, eliminacion y cache. Sin clave de servidor el endpoint falla cerrado con 503 y no escribe nada.
4. Validar Safari/iPhone y PWA fisicos. No disponibles en estas pruebas.
5. Solo con nueva autorizacion: aplicar migracion productiva y publicar frontend/API. No se requiere cambiar ninguna configuracion de catalogos existentes.

Rollback de interfaz: volver al frontend anterior es compatible con el campo y la proyeccion ampliada; conservar RLS, politicas y archivos. No borrar logotipos ni revertir migraciones de pedidos.

Referencias tecnicas: [Vercel Node Functions](https://vercel.com/docs/functions/runtimes/node-js), [validacion/limites de sharp](https://sharp.pixelplumbing.com/api-constructor/), [control de acceso de Supabase Storage](https://supabase.com/docs/guides/storage/security/access-control).
