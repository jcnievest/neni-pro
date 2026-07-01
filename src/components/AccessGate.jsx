import { LockKeyhole } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_URL } from "@/lib/access";
import { useAuth } from "@/lib/AuthContext";

const AccessLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
  </div>
);

function isReadOnlyRoute(pathname) {
  return (
    pathname === "/clientes" ||
    pathname === "/productos" ||
    pathname === "/pedidos" ||
    /^\/pedido\/[^/]+$/.test(pathname)
  );
}

const ReadOnlyNotice = () => (
  <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
    <p className="text-sm font-semibold text-amber-800">Modo solo lectura</p>
    <p className="mt-0.5 text-xs leading-5 text-amber-700">
      Tu prueba terminó. Puedes consultar tus datos, pero para crear, editar,
      cobrar, entregar o promocionar necesitas activar tu suscripción.
    </p>
    <a
      href={SUBSCRIPTION_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-block rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold text-white"
    >
      Suscribirme ahora
    </a>
  </div>
);

export default function AccessGate({ children }) {
  const { accessState, isLoadingAccess, logout } = useAuth();
  const location = useLocation();

  if (isLoadingAccess) {
    return <AccessLoader />;
  }

  if (accessState.hasAccess) {
    return children;
  }

  if (isReadOnlyRoute(location.pathname)) {
    return (
      <>
        <ReadOnlyNotice />
        {children}
      </>
    );
  }

  return (
    <section className="flex min-h-[60vh] items-center justify-center px-1 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-rose-200 bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LockKeyhole className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-display font-bold tracking-tight text-foreground">
          Tu prueba gratuita terminó
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Para seguir usando Nenis Pro y mantener el control de tus pedidos,
          cobros, entregas y ganancias, activa tu suscripción.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Tus datos se conservan. Al suscribirte podrás continuar donde te quedaste.
        </p>
        <div className="mt-6 space-y-3">
          <Button asChild className="h-11 w-full font-semibold">
            <a href={SUBSCRIPTION_URL} target="_blank" rel="noopener noreferrer">
              Suscribirme ahora
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => logout()}
          >
            Cerrar sesión
          </Button>
        </div>
      </div>
    </section>
  );
}
