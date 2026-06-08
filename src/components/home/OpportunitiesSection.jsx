import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Truck, AlertCircle, Package, TrendingUp, Users } from "lucide-react";

export default function OpportunitiesSection({ orders, products, inactiveClients, bestMonth, currentMonthSales }) {
  const today = new Date().toISOString().slice(0, 10);

  const opportunities = [];

  // Entregas pendientes hoy
  const todayDeliveries = orders.filter(
    (o) => o.delivery_date === today && !o.delivered && o.status !== "cancelado"
  );
  if (todayDeliveries.length > 0) {
    opportunities.push({
      icon: Truck,
      color: "text-amber-600",
      bg: "bg-amber-50",
      text: `${todayDeliveries.length} entrega${todayDeliveries.length !== 1 ? "s" : ""} pendiente${todayDeliveries.length !== 1 ? "s" : ""} para hoy`,
      action: { label: "Ver entregas", to: "/entregas" },
    });
  }

  // Cobros pendientes
  const pendingPay = orders.filter((o) => (o.balance || 0) > 0 && o.status !== "cancelado");
  if (pendingPay.length > 0) {
    opportunities.push({
      icon: AlertCircle,
      color: "text-rose-500",
      bg: "bg-rose-50",
      text: `${pendingPay.length} pedido${pendingPay.length !== 1 ? "s" : ""} con saldo pendiente`,
      action: { label: "Recordar pago", to: "/cobros" },
    });
  }

  // Clientes inactivos
  if (inactiveClients > 0) {
    opportunities.push({
      icon: Users,
      color: "text-violet-500",
      bg: "bg-violet-50",
      text: `${inactiveClients} cliente${inactiveClients !== 1 ? "s" : ""} sin compras en 30 días`,
      action: { label: "Ver clientes", to: "/clientes" },
    });
  }

  // Cerca del mejor mes
  if (bestMonth > 0 && currentMonthSales < bestMonth && bestMonth - currentMonthSales <= bestMonth * 0.2) {
    opportunities.push({
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      text: `Te faltan $${(bestMonth - currentMonthSales).toLocaleString()} para superar tu mejor mes`,
      action: { label: "Ver avance", to: "/" },
    });
  }

  // Productos para promocionar
  const offerProducts = products.filter((p) => p.is_offer);
  if (offerProducts.length > 0) {
    opportunities.push({
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/10",
      text: `${offerProducts.length} producto${offerProducts.length !== 1 ? "s" : ""} en oferta listo${offerProducts.length !== 1 ? "s" : ""} para promocionar`,
      action: { label: "Promocionar", to: `/promocionar?id=${offerProducts[0].id}` },
    });
  }

  if (opportunities.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-display font-semibold text-sm">Hoy puedes vender más</h3>
      <div className="space-y-2">
        {opportunities.map((op, i) => (
          <div key={i} className={`${op.bg} rounded-xl p-3 flex items-center justify-between gap-2`}>
            <div className="flex items-center gap-2.5">
              <op.icon className={`w-4 h-4 ${op.color} shrink-0`} />
              <p className="text-sm">{op.text}</p>
            </div>
            <Link to={op.action.to}>
              <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs shrink-0 bg-white/70">
                {op.action.label}
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}