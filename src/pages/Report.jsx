import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOrders } from "@/api/entities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, AlertCircle, BarChart3, Users, Package, Star } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { format, subMonths, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

function getMonthKey(date) {
  return format(date, "yyyy-MM");
}

function getMonthDate(monthKey) {
  return new Date(`${monthKey}-01T12:00:00`);
}

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function formatShortMoney(value) {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1000) return `$${Math.round(amount / 1000)}k`;
  return `$${amount}`;
}

export default function Report() {
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey(new Date()));

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => getOrders("-created_date", 2000),
  });

  const selectedDate = getMonthDate(selectedMonth);
  const selectedYear = selectedDate.getFullYear();
  const previousMonth = () => setSelectedMonth(getMonthKey(subMonths(selectedDate, 1)));
  const nextMonth = () => setSelectedMonth(getMonthKey(addMonths(selectedDate, 1)));
  const thisMonthKey = getMonthKey(new Date());

  const monthOrders = orders.filter(
    (o) =>
      o.status !== "cancelado" &&
      o.created_date?.slice(0, 7) === selectedMonth
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

  const yearlyData = Array.from({ length: 12 }, (_, index) => {
    const monthDate = new Date(selectedYear, index, 1, 12);
    const monthKey = getMonthKey(monthDate);
    const ordersForMonth = orders.filter(
      (o) => o.status !== "cancelado" && o.created_date?.slice(0, 7) === monthKey
    );
    const sold = ordersForMonth.reduce((s, o) => s + (o.total || 0), 0);
    const cost = ordersForMonth.reduce((s, o) => s + (o.total_cost || 0), 0);
    return {
      month: format(monthDate, "MMM", { locale: es }),
      monthKey,
      vendido: sold,
      ganancia: sold - cost,
    };
  });

  const chartConfig = {
    vendido: {
      label: "Vendido",
      color: "hsl(var(--primary))",
    },
    ganancia: {
      label: "Ganancia",
      color: "#059669",
    },
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-display font-bold">
            Reporte de {format(selectedDate, "MMMM yyyy", { locale: es })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {monthOrders.length} pedido{monthOrders.length !== 1 ? "s" : ""} en el mes seleccionado
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={previousMonth}>
            Anterior
          </Button>
          <input
            type="month"
            value={selectedMonth}
            max={thisMonthKey}
            onChange={(event) => setSelectedMonth(event.target.value || thisMonthKey)}
            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={nextMonth}
            disabled={selectedMonth >= thisMonthKey}
          >
            Siguiente
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={DollarSign} label="Vendido" value={formatMoney(totalSold)} color="text-primary" bgColor="bg-primary/10" />
        <StatCard icon={TrendingUp} label="Cobrado" value={formatMoney(totalCollected)} color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatCard icon={AlertCircle} label="Pendiente por cobrar" value={formatMoney(totalPending)} color="text-rose-500" bgColor="bg-rose-50" />
        <StatCard icon={BarChart3} label="Ganancia estimada" value={totalCost > 0 ? formatMoney(profit) : "—"} color="text-violet-600" bgColor="bg-violet-50" />
      </div>

      {totalCost === 0 && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
          💡 Agrega el costo a tus productos para ver tu ganancia estimada.
        </p>
      )}

      <Card className="border-0 p-4 shadow-sm">
        <div className="mb-3">
          <h3 className="font-display font-semibold text-sm">Evolución mensual {selectedYear}</h3>
          <p className="text-xs text-muted-foreground">Ventas y ganancia estimada mes por mes</p>
        </div>
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <LineChart data={yearlyData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
            />
            <YAxis
              width={42}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              tickFormatter={formatShortMoney}
              fontSize={11}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const monthKey = payload?.[0]?.payload?.monthKey;
                    return monthKey ? format(getMonthDate(monthKey), "MMMM yyyy", { locale: es }) : "";
                  }}
                  formatter={(value, name) => (
                    <div className="flex min-w-[8rem] items-center justify-between gap-3">
                      <span className="text-muted-foreground">
                        {chartConfig[name]?.label || name}
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        {formatMoney(value)}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="vendido"
              stroke="var(--color-vendido)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="ganancia"
              stroke="var(--color-ganancia)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" /> Vendido
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-600" /> Ganancia
          </span>
        </div>
      </Card>

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
              <p className="text-xs text-muted-foreground">Clientas activas este mes</p>
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
            <Row label="Vendido este mes" value={formatMoney(totalSold)} />
            <Row label="Costo de productos" value={`-${formatMoney(totalCost)}`} />
            <div className="border-t pt-2">
              <Row label="Ganancia estimada" value={formatMoney(profit)} bold />
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
