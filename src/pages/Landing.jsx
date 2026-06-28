import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";

const Logo = () => (
  <div className="flex items-center gap-2">
    <img src="/icons/icon-192x192.png" alt="Nenis Pro" className="w-8 h-8 rounded-xl" />
    <span className="font-bold text-lg" style={{ background: "linear-gradient(135deg, #e0478a, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
      Nenis Pro
    </span>
  </div>
);

const features = [
  { icon: "📦", title: "Pedidos organizados", desc: "Registra cada pedido con cliente, productos, fechas y estado." },
  { icon: "💰", title: "Cobros bajo control", desc: "Sabe quién te debe, cuánto falta y cuándo cobrar." },
  { icon: "📅", title: "Plan de pagos", desc: "Divide cobros en semanas, quincenas o meses." },
  { icon: "🛍️", title: "Catálogo para compartir", desc: "Comparte tu catálogo por link sin necesidad de app." },
  { icon: "📣", title: "Promocionar productos", desc: "Genera imágenes listas para estados de WhatsApp." },
  { icon: "📊", title: "Ganancia estimada", desc: "Sabe cuánto ganas por producto y por pedido." },
  { icon: "💳", title: "Tarjeta de cobro", desc: "Comparte tus datos bancarios de forma profesional." },
  { icon: "💬", title: "Mensajes para WhatsApp", desc: "Genera mensajes listos para copiar y enviar." },
];

const faqs = [
  { q: "¿Nenis Pro cobra mis ventas?", a: "No. Solo organiza tus ventas. No procesa pagos entre tú y tus clientas." },
  { q: "¿Mis clientas tienen que descargar la app?", a: "No. Pueden ver tu catálogo o productos desde un link." },
  { q: "¿Puedo usar WhatsApp?", a: "Sí. La app genera mensajes listos para copiar y te permite abrir WhatsApp directo." },
  { q: "¿Puedo registrar pagos por quincena?", a: "Sí. Puedes crear planes de pago semanales, quincenales, mensuales o personalizados." },
  { q: "¿La app revisa si me depositaron?", a: "No. Debes verificar el pago directamente en tu banco." },
  { q: "¿Cuánto cuesta?", a: "Después de la prueba gratuita cuesta $30 pesos al mes." },
];

const categories = ["ropa", "zapatos", "bolsas", "perfumes", "maquillaje", "skincare", "productos por catálogo", "accesorios", "postres", "regalos", "productos por pedido"];
function FAQ({ q, a }) {
    const [open, setOpen] = useState(false);
    return (
      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <span className="font-medium text-sm text-gray-800">{q}</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed">{a}</div>
        )}
      </div>
    );
  }
  
  export default function Landing() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
  
    return (
      <div className="min-h-screen bg-white font-sans">
        {/* SEO */}
        <title>Nenis Pro | Organiza tus ventas por WhatsApp</title>
  
        {/* HEADER */}
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-8 py-3 flex items-center justify-between">
            <Logo />
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-gray-500">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <nav className="hidden md:flex items-center gap-4 text-sm text-gray-600">
              <a href="#funciones" className="hover:text-pink-500">Funciones</a>
              <a href="#precio" className="hover:text-pink-500">Precio</a>
              <a href="#faqs" className="hover:text-pink-500">Preguntas</a>
              {user ? (
                <button onClick={() => navigate("/")} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-2 rounded-full text-sm font-medium">
                  Ir a mi cuenta
                </button>
              ) : (
                <>
                  <Link to="/login" className="text-gray-600">Iniciar sesión</Link>
                  <Link to="/register" className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-2 rounded-full text-sm font-medium">
                    Probar gratis
                  </Link>
                </>
              )}
            </nav>
          </div>
          {menuOpen && (
            <div className="md:hidden px-8 pb-4 flex flex-col gap-3 text-sm border-t border-gray-100 pt-3">
            <div className="md:hidden  pb-4 flex flex-col gap-3 text-sm border-t border-gray-100 pt-3">
              <a href="#funciones" onClick={() => setMenuOpen(false)} className="text-gray-600">Funciones</a>
              <a href="#precio" onClick={() => setMenuOpen(false)} className="text-gray-600">Precio</a>
              <a href="#faqs" onClick={() => setMenuOpen(false)} className="text-gray-600">Preguntas</a>
              {user ? (
                <button onClick={() => navigate("/")} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-2 rounded-full font-medium text-center">
                  Ir a mi cuenta
                </button>
              ) : (
                <>
                  <Link to="/login" className="text-gray-600 text-center">Iniciar sesión</Link>
                  <Link to="/register" className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-2 rounded-full font-medium text-center">
                    Probar gratis
                  </Link>
                </>
              )}
            </div>
          )}
        </header>
        {/* HERO */}
        <section className="max-w-6xl mx-auto px-8 pt-16 pb-20 text-center">
        <div className="inline-block bg-pink-50 text-pink-600 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          🚀 Gratis para probar
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-4">
          Organiza tus ventas, cobra mejor y sabe cuánto ganas
        </h1>
        <p className="text-gray-500 text-base mb-2">
          La libreta digital para mujeres que venden por WhatsApp, Facebook e Instagram.
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Controla pedidos, apartados, cobros, entregas, productos y ganancias desde tu celular.
        </p>
        <div className="flex flex-col gap-3">
          <Link to="/register" className="bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-pink-200">
            Probar gratis
          </Link>
          <Link to="/login" className="border border-gray-200 text-gray-600 py-4 rounded-2xl font-medium text-base">
            Iniciar sesión
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-4">Gratis para probar. Después solo $30 al mes.</p>
      </section>

      {/* PROBLEMA */}
      <section className="bg-gray-50 px-8 py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-extrabold text-gray-900 mb-6 text-center">
            ¿Vendes por WhatsApp y a veces se te pierden pedidos o cobros?
          </h2>
          <div className="space-y-3">
            {[
              "quién te debe",
              "cuánto falta cobrar",
              "qué pedido está apartado",
              "cuándo toca entregar",
              "cuánto ganaste realmente",
              "qué producto puedes promocionar",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 bg-white rounded-xl px-8 py-3 shadow-sm">
                <span className="text-pink-400 font-bold text-lg">?</span>
                <span className="text-sm text-gray-600">¿{item.charAt(0).toUpperCase() + item.slice(1)}?</span>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">Nenis Pro te ayuda a tener todo eso claro.</p>
        </div>
      </section>

      {/* FUNCIONES */}
      <section id="funciones" className="max-w-lg mx-auto px-8 py-12">
        <h2 className="text-xl font-extrabold text-gray-900 mb-2 text-center">Todo lo que necesitas</h2>
        <p className="text-sm text-gray-400 text-center mb-8">Funciones pensadas para vendedoras como tú</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {features.map((f) => (
            <div key={f.title} className="bg-gray-50 rounded-2xl p-4 space-y-1">
              <div className="text-2xl">{f.icon}</div>
              <p className="font-semibold text-sm text-gray-800">{f.title}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      {/* NO REEMPLAZA WHATSAPP */}
      <section className="bg-gradient-to-br from-pink-50 to-purple-50 px-8 py-12">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-4xl mb-4">💬</div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-3">
            No reemplaza WhatsApp. Te ayuda a vender mejor.
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            WhatsApp sigue siendo tu canal de venta. Nenis Pro es tu libreta digital para controlar lo que pasa después: pedidos, cobros, entregas y ganancias.
          </p>
        </div>
      </section>

      {/* CASOS DE USO */}
      <section className="max-w-6xl mx-auto px-8 py-12">
        <h2 className="text-xl font-extrabold text-gray-900 mb-6 text-center">Ideal para quienes venden…</h2>
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((cat) => (
            <span key={cat} className="bg-pink-50 text-pink-600 text-xs font-medium px-3 py-1.5 rounded-full capitalize">
              {cat}
            </span>
          ))}
        </div>
      </section>

      {/* PRECIO */}
      <section id="precio" className="bg-gray-50 px-8 py-12">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">Precio simple</h2>
          <div className="bg-white rounded-3xl p-8 shadow-sm mt-6 space-y-4">
            <div className="text-5xl font-extrabold" style={{ background: "linear-gradient(135deg, #e0478a, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              $30
            </div>
            <p className="text-gray-500 text-sm">pesos al mes</p>
            <p className="text-xs text-gray-400">Menos que una libreta y mucho menos que un cobro olvidado.</p>
            <Link to="/register" className="block bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-pink-200 mt-4">
              Probar gratis
            </Link>
            <p className="text-xs text-gray-400">7 días gratis, sin tarjeta.</p>
          </div>
        </div>
      </section>

      {/* FAQS */}
      <section id="faqs" className="max-w-6xl mx-auto px-8 py-12">
        <h2 className="text-xl font-extrabold text-gray-900 mb-6 text-center">Preguntas frecuentes</h2>
        <div className="space-y-2">
          {faqs.map((faq) => (
            <FAQ key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-gradient-to-br from-pink-500 to-purple-600 px-8 py-16">
        <div className="max-w-6xl mx-auto text-center space-y-6">
          <h2 className="text-2xl font-extrabold text-white leading-tight">
            Que no se te pierda ningún pedido, cobro ni ganancia
          </h2>
          <Link to="/register" className="block bg-white text-pink-600 py-4 rounded-2xl font-bold text-base shadow-lg">
            Probar gratis
          </Link>
          <p className="text-pink-100 text-xs">7 días gratis. Después $30/mes. Cancela cuando quieras.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 px-8 py-8">
        <div className="max-w-6xl mx-auto space-y-4">
          <Logo />
          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            <a href="#" className="hover:text-white">Aviso de privacidad</a>
            <a href="#" className="hover:text-white">Términos y condiciones</a>
            <a href="#" className="hover:text-white">Contacto</a>
            <Link to="/login" className="hover:text-white">Iniciar sesión</Link>
          </div>
          <p className="text-xs text-gray-600">© 2026 Nenis Pro. Hecho con 💜 para nenis.</p>
        </div>
      </footer>
    </div>
  );
}