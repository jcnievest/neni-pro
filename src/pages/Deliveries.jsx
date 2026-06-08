import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrders, updateOrder } from "@/api/entities";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Truck, ChevronLeft } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/TagBadge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function Deliveries() {
  const qc = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => getOrders("-created_date", 200),
  });

  const markDelivered = useMutation({
    mutationFn: (order) =>
      updateOrder(order.id, {
        delivered: true,
        status: "entregado",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("¡Entrega marcada como realizada!");
    },
  });

  const pending = orders
    .filter((o) => !o.delivered && o.status !== "cancelado")
    .sort((a, b) => (a.delivery_date || "9999").localeCompare(b.delivery_date || "9999"));

  // Group by date
  const grouped = {};
  pending.forEach((o) => {
    const key = o.delivery_date || "sin_fecha";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(o);
  });

  const dateLabel = (key) => {
    if (key === "sin_fecha") return "Sin fecha definida";
    const today = format(new Date(), "yyyy-MM-dd");
    if (key === today) return "Hoy";
    return format(new Date(key + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es });
  };

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> Inicio
      </Link>
      {pending.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="¡Todo entregado!"
          description="No tienes entregas pendientes"
        />
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground capitalize">{dateLabel(date)}</h3>
            {items.map((o) => (
              <Card key={o.id} className="p-3 border-0 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{o.client_name}</p>
                      <StatusBadge status={o.status} delivered={o.delivered} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {o.items?.length || 0} producto{(o.items?.length || 0) !== 1 ? "s" : ""} · ${o.total?.toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => markDelivered.mutate(o)}
                  >
                    <Check className="w-4 h-4 mr-1" /> Entregado
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ))
      )}
    </div>
  );
}