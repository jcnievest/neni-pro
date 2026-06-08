import { useQuery } from "@tanstack/react-query";
import { getOrders } from "@/api/entities";
import { Card } from "@/components/ui/card";
import { TrendingUp, DollarSign, AlertCircle, BarChart3, Users, Package, Star } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

export default function Report() {
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => getOrders("-created_date", 500),
  });

  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

  const monthOrders = orders.filter(
    (o) =>
      o.status !== "cancelado" &&
      o.created_date >= monthStart &&
      o.created_date <= monthEnd + "T23:59:59"
  );

  const totalSold = monthOrders.reduce((s, o) => s + (o.total || 0), 0);
  const totalCollected = monthOrders.reduce((s, o) => s + ((o.total || 0) - (o.balance || 0)), 0);
  const totalPending = monthOrders.reduce((s, o) => s + (o.balance || 0), 0);
  const totalCost = monthOrders.reduce((s, o) => s + (o.total_cost || 0), 0);
  const profit = totalSold - totalCost;

  // Active clients this month (unique client_id)
  const activeClientIds = new Set(monthOrders.map((o) => o.client_id).filter(Boolean));
  const activeClients = activeClientIds.size;

  // Top client by total purchased
  const clientTotals = {};
  monthOrders.forEach((o) => {
    if (!o.client_id) return;
    clientTotals[o.client_id] = clientTotals[o.client_id] || { name: o.client_name, total: 0 };
    clientTotals[o.client_id].total += o.total || 0;
  });
  const topClientEntry = Object.values(clientTotals).sort((a, b) => b.total - a.total)[0];

  // Top product by quantity sold
  const productQty = {};
  monthOrders.forEach((o) => {
    (o.items || []).forEach((item) => {
      if (!item.product_name) return;
      productQty[item.product_name] = (productQty[item.product_name] || 0) + (item.quantity || 1);
    });
  });
  const topProductEntry = Object.entries(productQty).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-bold">
          Reporte de {format(now, "MMMM yyyy", { locale: es })}
        </h2>
        <p className="text-sm text-muted-foreground">
          {monthOrders.length} pedido{monthOrders.length !== 1 ? "s" : ""} este mes
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={DollarSign} label="Vendido este mes" value={`$${totalSold.toLocaleString()}`} color="text-primary" bgColor="bg-primary/10" />
        <StatCard icon={TrendingUp} label="Cobrado" value={`$${totalCollected.toLocaleString()}`} color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatCard icon={AlertCircle} label="Pendiente por cobrar" value={`$${totalPending.toLocaleString()}`} color="text-rose-500" bgColor="bg-rose-50" />
        <StatCard icon={BarChart3} label="Ganancia estimada" value={totalCost > 0 ? `$${profit.toLocaleString()}` : "—"} color="text-violet-600" bgColor="bg-violet-50" />
      </div>

      {totalCost === 0 && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
          💡 Agrega el costo a tus productos para ver tu ganancia estimada.
        </p>
      )}

      {/* Highlights */}
      <div>
        <h3 className="font-display font-semibold text-sm mb-2">⭐ Destacados del mes</h3>
        <div className="space-y-2">
          {/* Active clients */}
          <div className="bg-card rounded-2xl p-3 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Clientes activas este mes</p>
              <p className="font-bold text-base">{activeClients} cliente{activeClients !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Top client */}
          {topClientEntry && (
            <div className="bg-card rounded-2xl p-3 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mejor clienta del mes</p>
                <p className="font-bold text-base">{topClientEntry.name}</p>
                <p className="text-xs text-muted-foreground">${topClientEntry.total.toLocaleString()} en compras</p>
              </div>
            </div>
          )}

          {/* Top product */}
          {topProductEntry && (
            <div className="bg-card rounded-2xl p-3 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Producto más vendido</p>
                <p className="font-bold text-base">{topProductEntry[0]}</p>
                <p className="text-xs text-muted-foreground">{topProductEntry[1]} unidades</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {totalCost > 0 && (
        <Card className="p-4 border-0 shadow-sm space-y-3">
          <h3 className="font-semibold text-sm">Detalle del mes</h3>
          <div className="space-y-2">
            <Row label="Vendido este mes" value={`$${totalSold.toLocaleString()}`} />
            <Row label="Costo de productos" value={`-$${totalCost.toLocaleString()}`} />
            <div className="border-t pt-2">
              <Row label="Ganancia estimada" value={`$${profit.toLocaleString()}`} bold />
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-1">Esto es una estimación para ayudarte a entender mejor tus ganancias.</p>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}