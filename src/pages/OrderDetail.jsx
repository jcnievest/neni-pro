import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrder } from "@/api/entities";
import { ChevronLeft, Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/TagBadge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import PaymentPlanDetail from "@/components/orders/PaymentPlanDetail";

export default function OrderDetail() {
  const { id } = useParams();

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["orders", id],
    queryFn: () => getOrder(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="space-y-4">
        <Link to="/pedidos" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> Pedidos
        </Link>
        <p className="text-center text-muted-foreground py-12">Pedido no encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <Link to="/pedidos" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> Pedidos
      </Link>

      {/* Header */}
      <Card className="p-4 border-0 shadow-sm space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display font-bold text-lg">{order.client_name}</p>
            {order.client_phone && <p className="text-xs text-muted-foreground">📱 {order.client_phone}</p>}
          </div>
          <StatusBadge status={order.status} delivered={order.delivered} />
        </div>
        {order.delivery_date && (
          <p className="text-xs text-muted-foreground">
            📅 Entrega: {format(new Date(order.delivery_date + "T12:00:00"), "d 'de' MMMM yyyy", { locale: es })}
          </p>
        )}
        {order.notes && <p className="text-xs text-muted-foreground italic">{order.notes}</p>}
      </Card>

      {/* Items */}
      {order.items?.length > 0 && (
        <Card className="p-4 border-0 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Productos</p>
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{item.product_name}</span>
                {item.quantity > 1 && <span className="text-xs text-muted-foreground">×{item.quantity}</span>}
              </div>
              <span className="font-medium">${(item.subtotal || item.unit_price)?.toLocaleString()}</span>
            </div>
          ))}
        </Card>
      )}

      {/* Financial summary */}
      <Card className="p-4 border-0 shadow-sm space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cobro</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold">${order.total?.toLocaleString()}</span>
          </div>
          {(order.advance || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Anticipo</span>
              <span className="text-emerald-600 font-medium">−${order.advance?.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1 mt-1">
            <span className="text-muted-foreground">Saldo pendiente</span>
            <span className={`font-bold ${(order.balance || 0) > 0 ? "text-rose-500" : "text-emerald-600"}`}>
              ${(order.balance || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </Card>

      {/* Payment plan */}
      {order.payment_plan?.length > 0 && (
        <Card className="p-4 border-0 shadow-sm">
          <PaymentPlanDetail order={order} />
        </Card>
      )}
    </div>
  );
}