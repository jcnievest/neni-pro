import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getFirstCompletedOrderId } from "@/api/entities";
import { campaignAnalytics } from "@/lib/analytics";
import { onboardingState } from "@/lib/onboarding-state";

export default function FirstOrderWelcome({ user }) {
  const [dismissed, setDismissed] = useState(() => onboardingState.get(user.id, 'dismissed'));
  const restoreRef = useRef(null);
  const dismissRef = useRef(null);
  const focusAfterChange = useRef(false);
  const { data: firstOrderId, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['orders', user.id, 'first-completed'],
    queryFn: () => getFirstCompletedOrderId(user.id),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const eligible = !isPending && !isFetching && !isError && firstOrderId === null;

  useEffect(() => {
    if (eligible && !dismissed) void campaignAnalytics.trackOnboarding('onboarding_viewed', user);
  }, [eligible, dismissed, user]);

  useEffect(() => {
    if (!focusAfterChange.current) return;
    (dismissed ? restoreRef : dismissRef).current?.focus();
    focusAfterChange.current = false;
  }, [dismissed]);

  if (isPending) return <p role="status" className="text-sm text-muted-foreground">Cargando tus pedidos…</p>;
  if (isError) return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <p>No pudimos consultar tus primeros pasos.</p>
      <Button type="button" variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}>
        <RotateCcw aria-hidden="true" /> {isFetching ? 'Consultando…' : 'Reintentar'}
      </Button>
    </div>
  );
  if (!eligible) return null;
  if (dismissed) return (
    <Button ref={restoreRef} type="button" variant="link" className="h-auto min-h-11 whitespace-normal px-0 text-foreground underline" onClick={() => {
      onboardingState.set(user.id, 'dismissed', false);
      focusAfterChange.current = true;
      setDismissed(false);
    }}>
      <RotateCcw aria-hidden="true" /> Ver primeros pasos
    </Button>
  );

  return (
    <Card role="region" aria-labelledby="first-order-title" className="rounded-2xl border-border p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <img src="/icons/icon-96x96.png" alt="Nenis Pro" width="40" height="40" className="h-10 w-10 rounded-lg" />
        <Button ref={dismissRef} type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0 text-muted-foreground"
          aria-label="Ocultar bienvenida" title="Ocultar bienvenida" onClick={() => {
            onboardingState.set(user.id, 'dismissed', true);
            void campaignAnalytics.trackOnboarding('onboarding_dismissed', user);
            focusAfterChange.current = true;
            setDismissed(true);
          }}>
          <X aria-hidden="true" />
        </Button>
      </div>
      <h2 id="first-order-title" className="mt-2 text-lg font-display font-bold">¡Bienvenido a Nenis Pro! 💜</h2>
      <p className="mt-2 text-sm leading-6 text-foreground">Ya vendes por WhatsApp, Facebook o Instagram. Ahora vamos a poner tus pedidos en orden.</p>
      <p className="mt-2 text-sm leading-6 text-foreground">Registra tu primer pedido real. No necesitas crear clientes ni productos antes de comenzar.</p>
      <Button asChild className="mt-4 min-h-12 h-auto w-full whitespace-normal rounded-xl bg-[#b52d66] px-3 py-3 font-semibold text-primary-foreground hover:bg-[#a12659] dark:bg-primary dark:hover:bg-primary/90">
        <Link to="/pedidos/nuevo" onClick={() => { void campaignAnalytics.trackOnboarding('onboarding_first_order_clicked', user); }}>
          <Plus aria-hidden="true" /> Registrar mi primer pedido
        </Link>
      </Button>
    </Card>
  );
}
