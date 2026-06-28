export default function Terminos() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <a href="/" className="text-pink-500 text-sm mb-8 inline-block">← Volver</a>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Términos y Condiciones</h1>
        <p className="text-sm text-gray-400 mb-10">Última actualización: junio 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-600 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">1. Aceptación</h2>
            <p>Al registrarse y usar Nenis Pro, usted acepta estos Términos y Condiciones. Si no está de acuerdo, no debe usar el servicio.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">2. Descripción del servicio</h2>
            <p>Nenis Pro es una plataforma digital para oredidos, cobros, entregas, productos y ganancias. No es una plataforma de pagos ni procesa transacciones entre la usuaria y sus clientes.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">3. Cuenta y registro</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Debe proporcionar información verídica al registrarse</li>
              <li>Es responsable de mantener la confidencialidad de su contraseña</li>
              <li>Una cuenta es para uso personal de una sola usuaria</li>
              <li>Nos reservamos el derecho de suspender cuentas que violen estos términos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">4. Prueba gratuita y suscripción</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nenis Pro ofrece 7 días de prueba gratuita sin necesidad de tarjeta</li>
              <li>Al término de la prueba, elio cuesta $30 pesos mexicanos al mes</li>
              <li>El cobro se realiza mensualmente a través de MercadoPago</li>
              <li>Puede cancelar su suscripción en cualquier momento</li>
              <li>No se realizan reembolsos por períodos parciales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">5. Uso permitido</h2>
            <p>Nenis Pro es para uso personal y comercial legítimo. Queda prohibido:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Usar la plataforma para actives ilegales</li>
              <li>Intentar acceder a cuentas de otras usuarias</li>
              <li>Reproducir o distribuir el software sin autorización</li>
              <li>Usar la plataforma para enviar spam</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">6. Datos de la usuaria</h2>
            <p>Los datos que usted registra en Nenis Pro (clientes, pedidos, productos) son suyos. Nenis Pro no los vende ni comparte. En caso de cancelación, puede solicitar la exportación de sus datos escribiendo a <a href="mailto:contacto@nenispro.com" className="text-pink-500">contacto@nenispro.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">7. Disponibilidad</h2>
            <p>Nenis Pro se esfuerza por mantener el servicio disponible, pero no garantiza disponibilidad ininterrumpida. Podemos realizar mantenimientos programados avisando con anticipación.</p>
      </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">8. Limitación de responsabilidad</h2>
            <p>Nenis Pro no es responsable por pérdidas económicas derivadas del uso o imposibilidad de uso del servicio, ni por errores en la información registrada por la usuaria.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">9. Modificaciones</h2>
            <p>Nos reservamos el derecho de modificar estos términos. Los cambios serán notificados con al menos 15 días de anticipación por correo electrónico.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">10. Jurisdicción</h2>
            <p>Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia, las partes se someten a los tribunales competentes de Querétaro, Qro.</p>
          </section>

          <section>
            <h2 className="text- text-gray-800 mb-2">11. Contacto</h2>
            <p>Para cualquier duda sobre estos términos: <a href="mailto:contacto@nenispro.com" className="text-pink-500">contacto@nenispro.com</a></p>
          </section>

        </div>
      </div>
    </div>
  );
}
