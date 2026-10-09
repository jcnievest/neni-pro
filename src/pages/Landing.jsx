import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ClipboardList, Menu, Users, Wallet, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { campaignAnalytics } from '@/lib/analytics';
import { StatusBadge, ClientTag } from '@/components/shared/TagBadge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const benefits = [
  { icon: Users, title: 'Clientes identificados', text: 'Guarda sus datos y notas para tener a mano con quién estás tratando.' },
  { icon: ClipboardList, title: 'Pedidos registrados', text: 'Anota qué te pidieron, cantidades, precio y fecha de entrega.' },
  { icon: Wallet, title: 'Cobros con seguimiento', text: 'Registra anticipos y pagos, y consulta cuánto queda pendiente.' },
];
const faqs = [
  ['¿Necesito dejar de usar WhatsApp, Facebook o Instagram?', 'No. Sigue conversando y acordando tus ventas como siempre. Registra manualmente los clientes y pedidos en Nenis Pro; la app no importa ni sincroniza tus conversaciones.'],
  ['¿Nenis Pro cobra mis ventas o verifica depósitos?', 'No. Nenis Pro no procesa los pagos de tus ventas ni verifica depósitos bancarios. Tú confirmas cada pago y lo registras en la app.'],
  ['¿Puedo llevar pagos parciales?', 'Sí. Puedes registrar anticipos y crear un plan de pagos con importes y fechas. El seguimiento depende de los pagos que tú registres.'],
  ['¿Cuánto cuesta?', 'Tienes 7 días gratis, sin tarjeta. Después, Nenis Pro cuesta $30 pesos al mes. Puedes cancelar cuando quieras.'],
  ['¿Qué pasa cuando termina la prueba?', 'Necesitas una suscripción activa para continuar creando o modificando datos. Puedes seguir consultando tus clientes, productos y pedidos existentes en modo de solo lectura.'],
  ['¿Mis clientes necesitan instalar Nenis Pro?', 'No. La app te ayuda a organizar tu negocio. Tus clientes pueden seguir hablando contigo en las redes que ya usan.'],
];

function Brand() {
  return <Link to="/" aria-label="Nenis Pro, inicio" className="inline-flex items-center gap-2 font-display text-xl font-bold text-foreground">
    <img src="/icons/icon-192x192.png" width="36" height="36" alt="" className="rounded-lg" />Nenis Pro
  </Link>;
}

function CampaignLink({ placement, className = '' }) {
  return <Link to={campaignAnalytics.registrationUrl()} onClick={() => campaignAnalytics.trackCta(placement)}
    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#b72a62] px-6 py-3 text-center text-base font-semibold text-white hover:bg-[#9d2354] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b72a62] ${className}`}>
    Organizar mi negocio<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
  </Link>;
}

function ProductExample() {
  return <Tabs defaultValue="clientes" className="mx-auto mt-8 max-w-xl">
    <TabsList aria-label="Ejemplo de uso de Nenis Pro" className="grid h-12 w-full grid-cols-3">
      <TabsTrigger value="clientes" className="h-10">Clientes</TabsTrigger>
      <TabsTrigger value="pedidos" className="h-10">Pedidos</TabsTrigger>
      <TabsTrigger value="cobros" className="h-10">Cobros</TabsTrigger>
    </TabsList>
    <div className="min-h-[260px] pt-4">
      <TabsContent value="clientes" className="mt-0">
        <p className="mb-4 text-sm text-muted-foreground">1. Registra a tu cliente y agrega una nota que te ayude a darle seguimiento.</p>
        <Card className="rounded-lg p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3"><p className="font-semibold">Cliente de ejemplo</p><ClientTag tag="nuevo" /></div>
          <p className="mt-4 text-sm font-medium">Notas</p><p className="mt-1 text-sm text-muted-foreground">Prefiere recoger su pedido por la tarde.</p>
        </Card>
      </TabsContent>
      <TabsContent value="pedidos" className="mt-0">
        <p className="mb-4 text-sm text-muted-foreground">2. Registra el pedido con sus productos, cantidades y estado.</p>
        <Card className="rounded-lg p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">Cliente de ejemplo</p><StatusBadge status="apartado" /></div>
          <p className="mt-4 text-sm">1 bolsa de tela</p><p className="mt-2 font-semibold">Total: $200</p>
        </Card>
      </TabsContent>
      <TabsContent value="cobros" className="mt-0">
        <p className="mb-4 text-sm text-muted-foreground">3. Cuando confirmes un pago, regístralo y consulta el saldo pendiente.</p>
        <Card className="rounded-lg p-5 shadow-sm">
          <p className="font-semibold">Cliente de ejemplo</p>
          <dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt>Total</dt><dd>$200</dd></div><div className="flex justify-between gap-3"><dt>Anticipo registrado</dt><dd>$50</dd></div><div className="flex justify-between gap-3 font-semibold text-[#b72a62]"><dt>Pendiente por cobrar</dt><dd>$150</dd></div></dl>
        </Card>
      </TabsContent>
    </div>
    <p className="text-center text-xs text-muted-foreground">Ejemplo con datos ficticios y componentes de Nenis Pro.</p>
  </Tabs>;
}

export default function Landing() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="min-h-screen bg-white text-foreground [&_a]:focus-visible:outline-offset-4">
    <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4">Saltar al contenido</a>
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-4 px-5">
        <Brand />
        <nav aria-label="Navegación principal" className="hidden items-center gap-6 text-sm md:flex">
          <a href="#como-funciona" className="hover:underline">Cómo funciona</a><a href="#precio" className="hover:underline">Precio</a>
          <Link to="/login" className="text-muted-foreground hover:underline">Iniciar sesión</Link>
          {user ? <Link to="/inicio" className="font-semibold text-[#b72a62]">Ir a mi cuenta</Link> : <CampaignLink placement="navigation" />}
        </nav>
        <button type="button" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} aria-controls="landing-menu"
          onClick={() => setMenuOpen(!menuOpen)} className="flex h-11 w-11 items-center justify-center rounded-lg text-[#b72a62] focus-visible:ring-2 focus-visible:ring-primary md:hidden">
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
      {menuOpen && <nav id="landing-menu" aria-label="Navegación móvil" onKeyDown={(event) => { if (event.key === 'Escape') setMenuOpen(false); }}
        className="flex flex-col gap-4 border-t border-border px-5 py-5 md:hidden" onClick={() => setMenuOpen(false)}>
        <a href="#como-funciona">Cómo funciona</a><a href="#precio">Precio</a><Link to="/login">Iniciar sesión</Link>
        {user && <Link to="/inicio">Ir a mi cuenta</Link>}
        <CampaignLink placement="navigation" />
      </nav>}
    </header>
    <main id="contenido">
      <section className="bg-[#fff4f8] px-5 py-12 text-center sm:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="mb-5 text-sm font-semibold text-[#943052]">Nenis Pro · Para quienes venden por redes</p>
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">Ya tienes un negocio.<br /><span className="text-[#b72a62]">Dale más orden.</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#51434a] sm:text-lg">Vendes por WhatsApp, Facebook o Instagram. Registra tus clientes, pedidos y cobros en Nenis Pro y da seguimiento a lo que sigue.</p>
          <CampaignLink placement="hero" className="mt-7 w-full sm:w-auto" />
          <p className="mt-4 text-sm text-[#65505b]">7 días gratis, sin tarjeta. Después solo $30 al mes.</p>
        </div>
      </section>
      <section aria-label="Beneficios" className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-3">
        {benefits.map(({ icon: Icon, title, text }) => <div key={title}>
          <Icon className="mb-4 h-7 w-7 text-[#b72a62]" aria-hidden="true" />
          <h2 className="font-display text-xl font-bold">{title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
        </div>)}
      </section>
      <section id="como-funciona" className="border-y border-border bg-background px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-display text-3xl font-bold">De la conversación al seguimiento</h2>
          <p className="mx-auto mt-4 max-w-xl text-center leading-7 text-muted-foreground">Acuerda la venta en tus redes. Después, guarda los detalles en Nenis Pro para consultar qué sigue.</p>
          <ProductExample />
          <p className="mt-8 text-center text-sm text-[#943052]">Tip de La Tía Nenis: cada pedido merece su lugar.</p>
        </div>
      </section>
      <section id="precio" className="mx-auto max-w-3xl px-5 py-14 text-center">
        <h2 className="font-display text-3xl font-bold">Un precio sencillo para tu negocio</h2>
        <p className="mt-6 text-lg font-semibold">7 días gratis</p>
        <p className="mt-2 text-5xl font-bold text-[#b72a62]">$30<span className="text-base font-normal text-foreground"> pesos al mes después</span></p>
        <ul className="mx-auto my-7 flex max-w-md flex-wrap justify-center gap-x-5 gap-y-3 text-sm">
          {['Sin tarjeta para probar', 'Cancela cuando quieras'].map(text => <li key={text} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-700" aria-hidden="true" />{text}</li>)}
        </ul>
        <CampaignLink placement="price" className="w-full sm:w-auto" />
        <p className="mx-auto mt-6 max-w-lg text-sm leading-6 text-muted-foreground">Nenis Pro no procesa los pagos de tus ventas ni verifica depósitos. Tú confirmas y registras cada pago.</p>
      </section>
      <section id="preguntas" className="border-t border-border px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 font-display text-3xl font-bold">Preguntas frecuentes</h2>
          {faqs.map(([q, a]) => <details key={q} className="border-b border-border py-5">
            <summary className="cursor-pointer font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{q}</summary>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{a}</p>
          </details>)}
        </div>
      </section>
      <section className="bg-[#fff4f8] px-5 py-14 text-center">
        <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold leading-tight">Tu negocio ya empezó. Ahora dale más orden</h2>
        <CampaignLink placement="closing" className="mt-7 w-full sm:w-auto" />
        <p className="mt-4 text-sm text-[#65505b]">7 días gratis. Después solo $30 al mes.</p>
      </section>
    </main>
    <footer className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
      <Brand /><nav aria-label="Información legal" className="flex flex-wrap gap-5 text-sm text-muted-foreground"><Link to="/privacidad">Aviso de privacidad</Link><Link to="/terminos">Términos y condiciones</Link><Link to="/login">Iniciar sesión</Link></nav>
    </footer>
  </div>;
}
