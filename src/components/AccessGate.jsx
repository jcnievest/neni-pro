import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_URL } from "@/lib/access";
import { useAuth } from "@/lib/AuthContext";

const AccessLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
  </div>
);

export default function AccessGate({ children }) {
  const { accessState, isLoadingAccess, logout } = useAuth();

  if (isLoadingAccess) {
    return <AccessLoader />;
  }

  if (accessState.hasAccess) {
    return children;
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
