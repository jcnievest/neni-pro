# Primer pedido: onboarding de Nenis Pro

Estado: implementado y validado en `codex/onboarding-primer-pedido`.
Publicacion a produccion autorizada por el usuario el 17 de noviembre de 2026.
El PR y sus comprobaciones de Vercel registran el resultado del despliegue.
Revision y pruebas: 17 de noviembre de 2026.

## Inspeccion y alcance

- React 18, Vite, React Router, TanStack Query, Supabase Auth/Postgres y Sonner.
- Inicio es `src/pages/Home.jsx`; el flujo de tres pasos es `src/pages/NewOrder.jsx`.
- El ID de Supabase Auth identifica al propietario. Las consultas filtran `user_id`; se conserva RLS.
- El formulario ya permite **Continuar como "nombre"**, escribir productos y no marcar **Guardar en catalogo**. No hace falta crear clientes ni productos previamente.
- `createOrder` guarda orden, partidas, plan opcional y entrega, y despues vuelve a leer el pedido. No se modificaron estos pasos, el descuento de stock ni sus validaciones.
- La entrega es el ultimo paso de persistencia, incluso si no hay fecha de entrega. Es el mismo criterio de pedido completo que ya usa `claim_campaign_milestone`.
- No existe campo de demo/prueba en el esquema. Todos los pedidos persistidos completos cuentan como uso real; no se generan datos en la app.
- Se conserva Inicio, Nuevo pedido, cobros, entregas, recomendaciones, autenticacion, trial, suscripciones y precios.
- No se agregaron servicios, dependencias de la app ni migraciones.

## Comportamiento

1. Inicio consulta solo el ID del primer pedido completo, ordenado por fecha e ID. No usa una lista vacia por defecto como prueba de que la cuenta sea nueva.
2. Mientras consulta, muestra un estado breve de carga. Ante error, permite reintentar sin ocultar el dashboard ni asumir cero pedidos.
3. Si no hay pedidos completos, muestra `FirstOrderWelcome` con el logo oficial, los textos solicitados y el enlace directo a `/pedidos/nuevo`.
4. La X oculta la tarjeta y deja **Ver primeros pasos**. La preferencia persiste por cuenta en ese dispositivo. El foco de teclado pasa al control que la reemplaza.
5. Tras guardar, se conserva la redireccion inmediata a `/pedidos` y el aviso habitual. Una lectura adicional comprueba que el pedido guardado sea el primero del usuario; entonces reemplaza ese mismo aviso por la felicitacion, sin crear dos notificaciones de exito simultaneas.
6. La felicitacion menciona Cobros solo con saldo positivo y Entregas solo con fecha registrada y entrega pendiente. Dura nueve segundos y se puede cerrar. Funciona sin Meta Pixel.
7. Un error de la comprobacion adicional conserva el aviso normal; no convierte un guardado exitoso en error. Antes de felicitar se comprueba que siga activa la misma cuenta.
8. Al volver con pedidos completos desaparece la bienvenida. Se cuenta el historial completo, no solo los 500 pedidos del dashboard. Un pedido que se guardo y luego fue cancelado tambien es uso historico; abandonar o cancelar el formulario no lo es.
9. Las consultas de Inicio y del formulario usan claves de cache por usuario. Las invalidaciones existentes por prefijo siguen funcionando.

## Eventos

Se reutiliza el unico Pixel existente y su infraestructura, con la misma lista de dominios permitidos. En localhost y vistas previas no se envian eventos a Meta.

| Evento externo | Disparador | Deduplicacion |
| --- | --- | --- |
| `onboarding_viewed` | Tarjeta elegible realmente mostrada, no carga/error/oculta | Una vez por cuenta y dispositivo |
| `onboarding_first_order_clicked` | Clic en el CTA de la bienvenida | Una vez por cuenta y dispositivo |
| `onboarding_dismissed` | Ocultar bienvenida | Una vez por cuenta y dispositivo |
| `first_order_created` | Exito de `createOrder` y reclamacion aprobada por el servidor | Una vez por usuario en `campaign_milestones` |

Los tres eventos de bienvenida no envian ID de usuario. Solo usan los codigos de atribucion ya permitidos. La activacion envia ademas el identificador opaco del evento del servidor, no el ID del pedido. No se envian nombres, telefonos, importes, productos, notas ni fechas de entrega.

**Compatibilidad:** `first_order_created` reemplaza el nombre externo `FirstOrderSaved`. El nombre interno de la reclamacion sigue siendo `FirstOrderSaved`, para conservar su restriccion unica y no duplicar conversiones con clientes antiguos. Un usuario cuyo hito ya estaba reclamado no se vuelve a contar. Los reportes historicos deben contemplar ambos nombres, separados por la fecha de despliegue, y las conversiones personalizadas que usen el nombre anterior deben revisarse antes de publicar.

Los eventos son de mejor esfuerzo: bloqueadores, falta del Pixel, problemas de red o consentimiento revocado fuera de esta app pueden impedir su recepcion. No se usa una cola alternativa para evadir bloqueos.

### Retorno y uso recurrente

No se incorporo otro rastreador ni un identificador externo. Para una primera evaluacion se pueden analizar, dentro de Supabase, los timestamps ya existentes de pedidos completos:

- Tiempo entre alta de cuenta y primer pedido completo.
- Cuentas que guardan un segundo pedido.
- Cuentas que guardan pedidos en dos o mas dias distintos.
- Actividad de pedidos en los dias 1 y 7 posteriores al primero, usando `America/Mexico_City` y cohortes que ya hayan alcanzado esos dias.

Esto mide **uso recurrente para registrar pedidos**, no todas las visitas: abrir Inicio o consultar Cobros sin guardar pedidos no aparece en estos indicadores. La retencion exacta de visitas D1/D7 queda pendiente; requeriria acordar consentimiento y almacenamiento de eventos de uso. `onboarding_viewed` esta deduplicado y no debe interpretarse como numero de sesiones.

## Archivos

### Aplicacion

- `src/components/home/FirstOrderWelcome.jsx`: componente nuevo; reutiliza Card, Button, Link y logo existente.
- `src/lib/onboarding-state.js`: preferencias por cuenta/dispositivo, control de avisos unicos y descripcion contextual.
- `src/pages/Home.jsx`: integra la bienvenida sin cambiar la estructura del dashboard existente.
- `src/pages/NewOrder.jsx`: extiende solo el callback de exito; reutiliza Sonner y la navegacion existente.
- `src/api/entities.js`: nueva consulta de solo lectura `getFirstCompletedOrderId`.
- `src/lib/campaign-analytics.js`: eventos allowlisted y nombre externo de activacion.

### Pruebas y documentacion

- `tests/onboarding.test.mjs`: preferencias, cuentas independientes, pestañas, errores y mensajes contextuales.
- `tests/first-completed-order.test.mjs`: propietario, primer pedido completo, filas parciales, errores e historial.
- `tests/campaign-analytics.test.mjs`: eventos, payloads sin datos personales, bloqueo y deduplicacion.
- `tests/fixtures/auth-server.mjs`: amplía la API ficticia local para dos cuentas y escenarios de prueba.
- Este documento y capturas de prueba en `screenshots/`.

## Verificacion realizada

- `npm run lint`: correcto.
- `npm run typecheck`: correcto (respeta el alcance limitado del jsconfig existente).
- `npm run build -- --outDir /tmp/nenis-onboarding-build`: correcto; aviso preexistente de Browserslist desactualizado.
- 42 pruebas automatizadas aprobadas, sin omisiones, incluyendo las migraciones existentes en PostgreSQL local PGlite. Ese motor se instalo solo en `/tmp`, no en las dependencias del proyecto.
- Navegador local, dos cuentas ficticias: bienvenida, descarte, recarga, restauracion mediante teclado, CTA, abandonar formulario, fallo total, fallo parcial, primer pedido, segundo pedido y regreso al dashboard.
- Pedido escrito manualmente guardado sin crear filas en clientes/productos.
- Error de consulta: no muestra una falsa bienvenida; el reintento pasa por carga y recupera la tarjeta.
- Escritorio 1280x720, movil 390x844 y 320x740; sin desbordamiento horizontal de la bienvenida. Logo cargado, foco de descarte/restauracion y tema oscuro comprobados.
- El mensaje con pendiente de Cobros se verifico en navegador. Las combinaciones con/sin fecha de entrega y saldo estan cubiertas por pruebas unitarias. La automatizacion del campo fecha del navegador local no actualizo el estado de React; confirmar la captura de fecha en un telefono real sigue pendiente.

## Como probar antes de desplegar

Desde la carpeta del repositorio, abrir dos terminales:

```sh
PORT=54330 APP_ORIGIN=http://127.0.0.1:5175 node tests/fixtures/auth-server.mjs
```

```sh
VITE_SUPABASE_URL=http://127.0.0.1:54330 VITE_SUPABASE_ANON_KEY=test-local-only npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

Abrir `http://127.0.0.1:5175/login`. Usar `demo@example.test` o `second@example.test` y la clave ficticia `test-password`. No usar correos ni claves reales. La prueba no manda correos ni cobros y no conecta con Supabase productivo.

Escenarios opcionales, exclusivamente contra la API ficticia local (reemplazan solo sus datos desechables en memoria):

```sh
curl -X POST http://127.0.0.1:54330/test/scenario -H 'Content-Type: application/json' --data '{"scenario":"empty"}'
```

Cambiar `empty` por `existing` (pedido de la primera cuenta), `query-error` o `slow`. Recargar Inicio. Para un fallo de guardado escribir `simulate-order-failure` en Notas; para un fallo despues de insertar la orden, `simulate-items-failure`. Las preferencias siguen guardadas por cuenta en este navegador: restaurar con **Ver primeros pasos** o usar un perfil de prueba nuevo para repetir el aviso de primer pedido.

Suite completa, con PGlite opcional instalado fuera del proyecto:

```sh
npm install --prefix /tmp/nenis-onboarding-tests --cache /tmp/nenis-onboarding-npm-cache --no-save @electric-sql/pglite
PGLITE_MODULE=file:///tmp/nenis-onboarding-tests/node_modules/@electric-sql/pglite/dist/index.js node --experimental-vm-modules --test tests/*.test.mjs
```

## Riesgos y pendientes antes de publicar

1. **Privacidad preexistente:** no hay gestor de consentimiento en el codigo y `Privacidad.jsx` dice que no hay cookies publicitarias, aunque `index.html` carga Meta. Debe alinearse el aviso con el mecanismo de consentimiento antes de publicar. No se invento consentimiento ni se altero la politica en esta tarea.
2. **Guardado no atomico preexistente:** si fallan partidas, pagos o entrega, puede quedar una fila parcial en `orders`. El onboarding no la cuenta como activacion, pero el dashboard existente aun puede mostrarla. Se reprodujo solo en el servidor ficticio; resolver la transaccion completa seria un cambio separado de backend.
3. **Persistencia local:** descarte, eventos de bienvenida y felicitacion se guardan por cuenta/dispositivo; borrar almacenamiento o cambiar dispositivo los reinicia. Sin almacenamiento hay respaldo en memoria durante la visita. Web Locks coordina pestañas cuando esta disponible; sin esa API la deduplicacion de UI entre pestañas es de mejor esfuerzo. La conversion del primer pedido conserva deduplicacion del servidor entre dispositivos.
4. **Fuente de verdad:** se reutiliza `orders + deliveries`, sin migracion. Antes de desplegar, probar la relacion PostgREST y RLS con dos cuentas de staging, incluidos pedidos importados que pudieran no tener fila de entrega. No se consultaron ni modificaron datos de produccion.
5. **Analitica:** probar recepcion en Meta Test Events solo en el entorno/dominio autorizado y revisar el cambio de nombre externo. Las pruebas locales usan un Pixel simulado; no se enviaron conversiones ficticias a Meta. No existe garantia de entrega exactamente una vez con bloqueadores/fallos de red.
6. **Dispositivo real:** verificar PWA/iOS y captura de fecha. Las pruebas visuales locales no sustituyen esa comprobacion.

Se excluyen de la publicacion las eliminaciones locales previas de capturas de campana y `supabase/.temp/`. La publicacion utiliza la integracion existente de GitHub con Vercel, sin migraciones ni cambios a datos reales. Las limitaciones anteriores no se consideran verificadas por el despliegue.
