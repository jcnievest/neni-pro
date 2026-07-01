import { useQuery } from "@tanstack/react-query";
import { getOrders } from "@/api/entities";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, ShoppingBag, ChevronLeft } from "lucide-react";
import { StatusBadge } from "@/components/shared/TagBadge";
import EmptyState from "@/components/shared/EmptyState";
import { format } from "date-fns";
import { useAuth } from "@/lib/AuthContext";

export default function Orders() {
  const { accessState } = useAuth();
  const canCreate = accessState.hasAccess;

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => getOrders("-created_date", 200),
  });

  return (
    <div className="space-y-4">
      <Link to="/" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> Inicio
      </Link>
      {canCreate && (
        <Link to="/pedidos/nuevo">
          <Button className="w-full">
            <Plus className="w-5 h-5 mr-2" /> Nuevo pedido
          </Button>
        </Link>
      )}

      {orders.length === 0 && !isLoading ? (
        <EmptyState
          icon={ShoppingBag}
          title="Sin pedidos aún"
          description={canCreate ? "Crea tu primer pedido" : "Tus pedidos aparecerán aquí al activar tu suscripción"}
        />
      ) : (
        <div className="space-y-2">
        {orders.map((o) => (
          <Link key={o.id} to={`/pedido/${o.id}`}>
            <Card className="p-3 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{o.client_name}</p>
                    <StatusBadge status={o.status} delivered={o.delivered} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {o.items?.length || 0} producto{(o.items?.length || 0) !== 1 ? "s" : ""} ·{" "}
                    Total: ${o.total?.toLocaleString()}
                  </p>
                  <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                    {(o.balance || 0) > 0 && (
                      <span className="text-rose-500 font-medium">Saldo: ${o.balance?.toLocaleString()}</span>
                    )}
                    {o.delivery_date && <span>Entrega: {format(new Date(o.delivery_date + "T12:00:00"), "dd/MM/yyyy")}</span>}
                    {o.payment_plan?.length > 0 && (
                      <span className="text-primary font-medium">📅 {o.payment_plan.length} pago{o.payment_plan.length !== 1 ? "s" : ""} en plan</span>
                    )}
                  </div>
                  {(o.total_cost || 0) > 0 && (
                    <p className="text-xs text-emerald-600 font-medium">
                      Ganancia est.: ${((o.total || 0) - (o.total_cost || 0)).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
        </div>
      )}
    </div>
  );
}
