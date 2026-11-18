export default function Privacidad() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <a href="/" className="text-pink-500 text-sm mb-8 inline-block">← Volver</a>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Aviso de Privacidad</h1>
        <p className="text-sm text-gray-400 mb-10">Última actualización: junio 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-600 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">1. Responsable</h2>
            <p>Juan Carlos Nieves Torres (en adelante "Nenis Pro"), con RFC NITJ790930845, con domicilio en Querétaro, Qro., es responsable del tratamiento de sus datos personales conforme a lo establecido en la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).</p>
            <p className="mt-2">Conta <a href="mailto:contacto@nenispro.com" className="text-pink-500">contacto@nenispro.com</a></p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">2. Datos que recabamos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nombre y correo electrónico al registrarse</li>
              <li>Información de uso de la plataforma (pedidos, productos, clientes registrados por la usuaria)</li>
              <li>Datos de pago procesados por MercadoPago (Nenis Pro no almacena datos de tarjetas)</li>
            </ul>
          </section>

          <section id="solicitudes">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Solicitudes desde un catálogo público</h2>
            <p>Al enviar una solicitud compartes tu nombre, número de WhatsApp, productos seleccionados y observaciones con el vendedor del catálogo, para que revise la disponibilidad y te contacte sobre ese pedido. La autorización del formulario es para atender esta solicitud, no para suscribirte a publicidad.</p>
            <p className="mt-2">Nenis Pro conserva la solicitud y su historial de cambios en Supabase. Solo el vendedor puede consultar tus datos de contacto desde su cuenta. El enlace privado permite revisar productos, condiciones y estado, aceptar ajustes o cancelar antes de la confirmación; no muestra tu nombre ni tu teléfono. No compartas ese enlace con otras personas.</p>
            <p className="mt-2">El envío no confirma una compra ni reserva existencias. Nenis Pro no procesa los pagos de estas ventas ni verifica depósitos. Conservamos un registro de la autorización y métricas de uso del catálogo, sin enviar nombres, teléfonos u observaciones a plataformas publicitarias. Estas pantallas no cargan Meta Pixel.</p>
            <p className="mt-2">Puedes solicitar acceso, corrección o eliminación de tus datos al vendedor o a <a href="mailto:contacto@nenispro.com" className="underline">contacto@nenispro.com</a>, indicando el folio de tu solicitud.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">3. Finalidades del tratamiento</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Proveer y mejorar el servicio de Nenis Pro</li>
              <li>Gestionar su cuenta y suscripción</li>
              <li>Enviar comunicaciones relacionadas con el servicio</li>
              <li>Cumplir con obliganes legales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">4. Transferencia de datos</h2>
            <p>Sus datos no se venden ni se comparten con terceros, salvo con proveedores de infraestructura necesarios para operar el servicio (Supabase para base de datos, MercadoPago para cobros), quienes cuentan con sus propias políticas de privacidad.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">5. Derechos ARCO</h2>
            <p>Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos personales. Para ejercer estos derechos envíe un correo a <a href="mailto:contacto@nenispro.com" className="text-pink-500">contacto@nenispro.com</a> con el asunto "Derechos ARCO".</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">6. Cookies</h2>
            <p>Nenis Pro utiliza cookies técas necesarias para el funcionamiento de la plataforma. No utilizamos cookies de rastreo publicitario de terceros.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">7. Cambios al aviso</h2>
            <p>Nos reservamos el derecho de modificar este aviso. Cualquier cambio será notificado a través de la plataforma o por correo electrónico.</p>
          </section>

        </div>
      </div>
    </div>
  );
}
