import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2, Link2Off, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { manageOrderTracking } from "@/api/order-tracking";
import { trackingUrl } from "@/lib/order-reference";

export default function OrderTrackingLink({ orderId }) {
  const qc = useQueryClient();
  const key = ["order-tracking", orderId];
  const { data: token, isLoading, isError, refetch } = useQuery({
    queryKey: key,
    queryFn: () => manageOrderTracking(orderId),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: (action) => manageOrderTracking(orderId, action),
    onSuccess: (value) => {
      qc.setQueryData(key, value);
      toast.success(value ? "Enlace de seguimiento activado" : "Enlace desactivado");
    },
    onError: () => toast.error("No se pudo actualizar el enlace. Intenta nuevamente."),
  });
  const url = token ? trackingUrl(token, window.location.origin) : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar. Selecciona el enlace para copiarlo manualmente.");
    }
  };

  return (
    <section className="space-y-3 border-t pt-4" aria-labelledby="tracking-title">
      <h2 id="tracking-title" className="text-sm font-semibold">Seguimiento para tu cliente</h2>
      <p className="text-xs text-muted-foreground">Cualquier persona con el enlace podrá ver el folio, estado y fecha de entrega. No incluye datos personales ni importes.</p>
      {isLoading ? <p role="status" className="text-sm">Cargando enlace…</p> : isError ? (
        <div role="alert" className="space-y-2 text-sm">
          <p>El seguimiento no está disponible en este momento.</p>
          <Button variant="outline" onClick={() => refetch()}>Reintentar</Button>
        </div>
      ) : token ? (
        <>
          <Input aria-label="Enlace de seguimiento" value={url} readOnly onFocus={(e) => e.target.select()} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={copy} disabled={mutation.isPending}><Copy className="mr-2 h-4 w-4" />Copiar enlace</Button>
            <Button asChild variant="outline"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Ver estado</a></Button>
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate("disable")}><Link2Off className="mr-2 h-4 w-4" />Desactivar enlace</Button>
          </div>
        </>
      ) : (
        <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate("enable")}><Link2 className="mr-2 h-4 w-4" />Crear enlace de seguimiento</Button>
      )}
    </section>
  );
}
