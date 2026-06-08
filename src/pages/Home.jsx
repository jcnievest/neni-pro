import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrders, getProducts, getSettings, upsertSettings } from "@/api/entities";
import { Link } from "react-router-dom";
import { DollarSign, Truck, ChevronRight, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/TagBadge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ProgressSection from "@/components/home/ProgressSection";
import PendingCollectionsCard from "@/components/home/PendingCollectionsCard";
import OpportunitiesSection from "@/components/home/OpportunitiesSection";
import FrequentClientsSection from "@/components/home/FrequentClientsSection";
import RecoverClientsSection from "@/components/home/RecoverClientsSection";

export default function Home() {
  const today = format(new Date(), "yyyy-MM-dd");
  const qc = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => getOrders("-created_date", 500),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts("name", 500),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => getSettings(),
  });
  const settings = settingsList[0];

  const updateSettingsMut = useMutation({
    mutationFn: (data) => upsertSettings(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  const todaySales = orders
    .filter((o) => o.created_date?.startsWith(today) && o.status !== "cancelado")
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const pendingPayments = orders.filter((o) => (o.balance || 0) > 0 && o.status !== "cancelado");
  const pendingDeliveries = orders.filter((o) => !o.delivered && o.status !== "cancelado");
  const todayPending = orders.filter((o) => o.delivery_date === today && !o.delivered && o.status !== "cancelado");

  // Payment plan indicators
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);
  let planOverdue = 0, planToday = 0, planWeekAmount = 0;
  orders.forEach((o) => {
    if (o.status === "cancelado") return;
    (o.payment_plan || []).forEach((p) => {
      if (p.status === "pagado") return;
      if (p.due_date && p.due_date < today) planOverdue++;
      if (p.due_date === today) planToday++;
      if (p.due_date && p.due_date >= today && p.due_date <= weekEndStr) planWeekAmount += (p.amount || 0);
    });
  });

  // Best month calc for opportunities
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const byMonth = {};
  orders.forEach((o) => {
    if (o.status === "cancelado" || !o.created_date) return;
    const key = o.created_date.slice(0, 7);
    byMonth[key] = (byMonth[key] || 0) + (o.total || 0);
  });
  const bestMonth = Math.max(0, ...Object.values(byMonth));
  const currentMonthSales = byMonth[thisMonthKey] || 0;

  // Ganancia estimada del mes
  const monthOrders = orders.filter(
    (o) => o.status !== "cancelado" && o.created_date?.startsWith(thisMonthKey)
  );
  const estimatedProfit = monthOrders.reduce((s, o) => {
    const cost = o.total_cost || 0;
    return cost > 0 ? s + (o.total || 0) - cost : s;
  }, 0);

  // Inactive clients count (for opportunities)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const clientLastDate = {};
  orders.forEach((o) => {
    if (o.status === "cancelado" || !o.client_id) return;
    if (!clientLastDate[o.client_id] || o.created_date > clientLastDate[o.client_id]) {
      clientLastDate[o.client_id] = o.created_date;
    }
  });
  const inactiveClientsCount = Object.values(clientLastDate).filter((d) => d < cutoffStr).length;

  const fechaNatural = format(new Date(), "EEEE d 'de' MMMM", { locale: es });
  const fechaCapitalizada = fechaNatural.charAt(0).toUpperCase() + fechaNatural.slice(1);

  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="pb-1">
        <h2 className="text-lg font-display font-bold tracking-tight">Tu día de ventas</h2>
        <p className="text-sm text-muted-foreground">{fechaCapitalizada}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          <span className="text-rose-500 font-medium">{pendingPayments.length} cobros pendientes</span>
          <span className="mx-1.5">·</span>
          <span className="text-amber-600 font-medium">{pendingDeliveries.length} entregas por realizar</span>
        </p>
      </div>

      {/* BIG CTA */}
      <Link to="/pedidos/nuevo">
        <Button className="w-full h-12 text-sm rounded-2xl shadow-md shadow-primary/20 font-display font-semibold">
          <Plus className="w-4 h-4 mr-1.5" />
          Nuevo pedido
        </Button>
      </Link>

      {/* Pendiente por cobrar — tarjeta destacada */}
      <PendingCollectionsCard pendingPayments={pendingPayments} />

      {/* Plan de pagos indicators */}
      {(planOverdue > 0 || planToday > 0 || planWeekAmount > 0) && (
        <Link to="/cobros">
          <div className="bg-card rounded-2xl p-3 shadow-sm space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plan de pagos</p>
            <div className="space-y-1">
              {planOverdue > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-rose-600 font-semibold">{planOverdue} pago{planOverdue !== 1 ? "s" : ""} vencido{planOverdue !== 1 ? "s" : ""}</span>
                </div>
              )}
              {planToday > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-amber-700 font-semibold">{planToday} pago{planToday !== 1 ? "s" : ""} por cobrar hoy</span>
                </div>
              )}
              {planWeekAmount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-emerald-700 font-semibold">${planWeekAmount.toLocaleString()} por cobrar esta semana</span>
                </div>
              )}
            </div>
          </div>
        </Link>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <Link to="/entregas">
          <div className="bg-card rounded-2xl p-3 shadow-sm text-center space-y-1 hover:shadow-md transition-shadow">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mx-auto">
              <Truck className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-lg font-bold font-display">{pendingDeliveries.length}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Por entregar</p>
          </div>
        </Link>
        <div className="bg-card rounded-2xl p-3 shadow-sm text-center space-y-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mx-auto">
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-bold font-display">${todaySales.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Vendido hoy</p>
        </div>
      </div>

      {/* Oportunidades */}
      <OpportunitiesSection
        orders={orders}
        products={products}
        inactiveClients={inactiveClientsCount}
        bestMonth={bestMonth}
        currentMonthSales={currentMonthSales}
      />

      {/* Progress / Gamification */}
      <ProgressSection
        orders={orders}
        settings={settings}
        onSaveGoal={(goal) => updateSettingsMut.mutate({ monthly_goal: goal })}
        estimatedProfit={estimatedProfit}
      />

      {/* Clientes frecuentes */}
      <FrequentClientsSection orders={orders} />

      {/* Clientes por recuperar */}
      <RecoverClientsSection orders={orders} />

      {/* Pendientes de hoy */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-semibold text-sm">Pendientes de hoy</h3>
          <Link to="/entregas" className="text-xs text-primary font-medium flex items-center gap-0.5">
            Ver todo <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {todayPending.length === 0 ? (
          <Card className="p-4 text-center border-0 shadow-sm bg-muted/40">
            <p className="text-sm text-muted-foreground">Todo al día por ahora</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {todayPending.map((order) => (
              <Card key={order.id} className="p-3 border-0 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{order.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${order.total?.toLocaleString()}
                      {(order.balance || 0) > 0 && (
                        <span className="text-rose-500 font-medium"> · Debe ${order.balance?.toLocaleString()}</span>
                      )}
                    </p>
                  </div>
                  <StatusBadge status={order.status} delivered={order.delivered} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Pedidos activos */}
      {orders.filter((o) => o.status !== "entregado" && o.status !== "cancelado").length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-semibold text-sm">Pedidos activos</h3>
            <Link to="/pedidos" className="text-xs text-primary font-medium flex items-center gap-0.5">
              Ver todo <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {orders.filter((o) => o.status !== "entregado" && o.status !== "cancelado").slice(0, 3).map((order) => (
              <Card key={order.id} className="p-3 border-0 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{order.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.items?.length || 0} producto{(order.items?.length || 1) !== 1 ? "s" : ""}
                      {order.delivery_date && ` · ${format(new Date(order.delivery_date + "T12:00:00"), "d MMM", { locale: es })}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={order.status} delivered={order.delivered} />
                    <p className="text-xs font-semibold">${order.total?.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}