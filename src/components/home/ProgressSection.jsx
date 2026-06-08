import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, TrendingUp, TrendingDown, Star } from "lucide-react";

function getMotivationalPhrase(current, lastMonth, bestMonth, goal) {
  // Priority: goal > best month > vs last month > empty
  if (goal > 0) {
    const pct = Math.min(100, Math.round((current / goal) * 100));
    if (current >= goal) return `¡Lograste tu meta mensual! Ya llevas $${current.toLocaleString()}.`;
    return `Llevas el ${pct}% de tu meta. Faltan $${(goal - current).toLocaleString()} para llegar.`;
  }
  if (current > bestMonth && bestMonth > 0) return "¡Este ya es tu mejor mes histórico! Sigue así.";
  if (bestMonth > 0 && bestMonth - current <= bestMonth * 0.15 && current < bestMonth) {
    return `Te faltan $${(bestMonth - current).toLocaleString()} para superar tu mejor mes.`;
  }
  if (lastMonth > 0 && current > lastMonth) {
    const pct = Math.round(((current - lastMonth) / lastMonth) * 100);
    return `Vas ${pct}% arriba que el mes pasado. ¡Buen ritmo!`;
  }
  if (lastMonth > 0 && current < lastMonth) {
    return `Te faltan $${(lastMonth - current).toLocaleString()} para igualar el mes pasado.`;
  }
  if (current === 0) return "Aún sin ventas este mes. ¡Hoy es un buen día para empezar!";
  return `Este mes llevas $${current.toLocaleString()} en ventas.`;
}

export default function ProgressSection({ orders, settings, onSaveGoal, estimatedProfit }) {
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const monthSales = (monthKey) =>
    orders
      .filter((o) => o.status !== "cancelado" && o.created_date?.startsWith(monthKey))
      .reduce((s, o) => s + (o.total || 0), 0);

  const current = monthSales(thisMonthKey);
  const lastMonth = monthSales(lastMonthKey);

  // Best month from all orders
  const byMonth = {};
  orders.forEach((o) => {
    if (o.status === "cancelado" || !o.created_date) return;
    const key = o.created_date.slice(0, 7);
    byMonth[key] = (byMonth[key] || 0) + (o.total || 0);
  });
  const bestMonth = Math.max(0, ...Object.values(byMonth));

  const goal = settings?.monthly_goal || 0;
  const goalPct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
  const diff = current - lastMonth;
  const phrase = getMotivationalPhrase(current, lastMonth, bestMonth, goal);

  const handleSaveGoal = () => {
    const val = parseFloat(goalInput);
    if (!isNaN(val) && val > 0) onSaveGoal(val);
    setEditingGoal(false);
    setGoalInput("");
  };

  return (
    <div className="space-y-3">
      <h3 className="font-display font-semibold text-sm">📈 Mi avance</h3>

      {/* Motivational phrase */}
      <div className="bg-primary/5 border border-primary/15 rounded-2xl p-3">
        <p className="text-sm text-foreground/80 leading-snug">{phrase}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3 border-0 shadow-sm space-y-0.5">
          <p className="text-[10px] text-muted-foreground">Este mes</p>
          <p className="text-lg font-bold font-display text-primary">${current.toLocaleString()}</p>
        </Card>
        <Card className="p-3 border-0 shadow-sm space-y-0.5">
          <p className="text-[10px] text-muted-foreground">Mes pasado</p>
          <p className="text-lg font-bold font-display">${lastMonth.toLocaleString()}</p>
          {lastMonth > 0 && (
            <div className={`flex items-center gap-1 text-[10px] font-medium ${diff >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
              {diff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {diff >= 0 ? "+" : ""}${diff.toLocaleString()}
            </div>
          )}
        </Card>
        {bestMonth > 0 && (
          <Card className="p-3 border-0 shadow-sm space-y-0.5">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-500" />
              <p className="text-[10px] text-muted-foreground">Mejor mes</p>
            </div>
            <p className="text-lg font-bold font-display text-amber-600">${bestMonth.toLocaleString()}</p>
          </Card>
        )}
        {/* Goal card */}
        <Card className="p-3 border-0 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Meta mensual</p>
            <button onClick={() => { setEditingGoal(true); setGoalInput(goal > 0 ? String(goal) : ""); }} className="text-muted-foreground hover:text-primary transition-colors">
              <Pencil className="w-3 h-3" />
            </button>
          </div>
          {editingGoal ? (
            <div className="flex gap-1">
              <Input
                type="number"
                className="h-7 text-xs px-2"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="Ej: 5000"
                autoFocus
              />
              <Button size="icon" className="h-7 w-7 shrink-0" onClick={handleSaveGoal}>
                <Check className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <p className="text-lg font-bold font-display">{goal > 0 ? `$${goal.toLocaleString()}` : "—"}</p>
          )}
        </Card>
      </div>

      {/* Ganancia estimada discreta */}
      {estimatedProfit > 0 && (
        <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
          <p className="text-xs text-emerald-700">Has ganado aprox. este mes</p>
          <p className="text-sm font-bold text-emerald-700">${estimatedProfit.toLocaleString()}</p>
        </div>
      )}

      {/* Goal progress bar */}
      {goal > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Avance hacia tu meta</span>
            <span className="font-semibold text-foreground">{goalPct}%</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${goalPct}%` }}
            />
          </div>
          {goal > current && (
            <p className="text-xs text-muted-foreground">Faltan ${(goal - current).toLocaleString()} para tu meta</p>
          )}
        </div>
      )}
    </div>
  );
}