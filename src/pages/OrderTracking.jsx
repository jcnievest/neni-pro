import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicOrderTracking } from "@/api/order-tracking";
import { formatOrderReference } from "@/lib/order-reference";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusLabels = {
  apartado: "Apartado",
  pendiente_pago: "Pago pendiente",
  pagado: "Pago registrado",
  cancelado: "Cancelado",
  entregado: "Entregado",
};

export default function OrderTracking() {
  const { hash } = useLocation();
  const token = hash.slice(1);
  const { data: order, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["public-order-tracking", token],
    queryFn: () => getPublicOrderTracking(token),
    retry: false,
    refetchInterval: 60000,
    gcTime: 0,
  });

  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow, noarchive";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  return <OrderTrackingView order={order} isLoading={isLoading} isError={isError} isFetching={isFetching} refetch={refetch} />;
}

export function OrderTrackingView({ order, isLoading = false, isError = false, isFetching = false, refetch }) {
  const status = order?.status === "cancelado" ? "Cancelado" : order?.delivered ? "Entregado" : statusLabels[order?.status] || "Pedido registrado";

  return (
    <main className="mx-auto min-h-screen max-w-lg space-y-6 px-5 py-10">
      <div className="flex items-center gap-3">
        <Package className="h-7 w-7 text-primary" aria-hidden="true" />
        <h1 className="text-xl font-display font-bold">Seguimiento de pedido</h1>
      </div>
      {isLoading ? <p role="status">Consultando estado…</p> : isError ? (
        <p role="alert">No pudimos consultar el estado. Intenta nuevamente.</p>
      ) : !order ? (
        <p>Este enlace no está disponible o fue desactivado. Pide un enlace actualizado a quien te vendió.</p>
      ) : (
        <section className="space-y-5 border-y py-6">
          <p className="break-all font-mono text-xl font-bold text-primary">{formatOrderReference(order.reference_number)}</p>
          <dl className="space-y-4">
            <div><dt className="text-sm text-muted-foreground">Estado registrado</dt><dd className="text-lg font-semibold">{status}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Entrega</dt><dd>{order.delivered ? "Realizada" : order.delivery_date ? format(new Date(`${order.delivery_date}T12:00:00`), "d 'de' MMMM yyyy", { locale: es }) : "Fecha por confirmar"}</dd></div>
          </dl>
          <p className="text-xs text-muted-foreground">Información registrada por quien te vendió. Para cambios o dudas, contáctale directamente.</p>
        </section>
      )}
      <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className="mr-2 h-4 w-4" />{isFetching ? "Actualizando…" : "Actualizar estado"}</Button>
      <p className="text-xs text-muted-foreground">Nenis Pro no procesa pagos ni verifica depósitos.</p>
    </main>
  );
}
