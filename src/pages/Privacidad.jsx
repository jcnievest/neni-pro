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
            <p className="mt-2">Conta href="mailto:contacto@nenispro.com" className="text-pink-500">contacto@nenispro.com</a></p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">2. Datos que recabamos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nombre y correo electrónico al registrarse</li>
              <li>Información de uso de la plataforma (pedidos, productos, clientes registrados por la usuaria)</li>
              <li>Datos de pago procesados por MercadoPago (Nenis Pro no almacena datos de tarjetas)</li>
            </ul>
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
