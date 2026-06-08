import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Calendar } from "lucide-react";
import { addDays, addWeeks, format } from "date-fns";

const FREQ_OPTIONS = [
  { value: "none", label: "Sin plan de pagos" },
  { value: "single", label: "Pago único pendiente" },
  { value: "weekly", label: "Pagos semanales" },
  { value: "biweekly", label: "Pagos quincenales" },
  { value: "monthly", label: "Pagos mensuales" },
  { value: "custom", label: "Fechas personalizadas" },
];

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function generateDates(freq, firstDate, count, amount) {
  const payments = [];
  let current = new Date(firstDate + "T12:00:00");
  for (let i = 0; i < count; i++) {
    payments.push({
      id: generateId(),
      amount,
      due_date: format(current, "yyyy-MM-dd"),
      status: "pendiente",
    });
    if (freq === "weekly") current = addWeeks(current, 1);
    else if (freq === "biweekly") current = addDays(current, 15);
    else if (freq === "monthly") {
      current = new Date(current);
      current.setMonth(current.getMonth() + 1);
    }
  }
  return payments;
}

export default function PaymentPlanForm({ balance, onPlanChange }) {
  const [freq, setFreq] = useState("none");
  const [numPayments, setNumPayments] = useState("3");
  const [firstDate, setFirstDate] = useState("");
  const [customPayments, setCustomPayments] = useState([]);

  const handleFreqChange = (val) => {
    setFreq(val);
    onPlanChange([]);
    if (val === "custom") {
      setCustomPayments([{ id: generateId(), amount: balance || 0, due_date: "", status: "pendiente" }]);
    }
  };

  const handleGenerate = () => {
    if (!firstDate || !numPayments) return;
    const count = parseInt(numPayments) || 1;
    const amountPer = Math.round((balance / count) * 100) / 100;
    const payments = generateDates(freq, firstDate, count, amountPer);
    // Adjust last to cover rounding
    const total = payments.reduce((s, p) => s + p.amount, 0);
    if (total !== balance && payments.length > 0) {
      payments[payments.length - 1].amount = Math.round((balance - total + payments[payments.length - 1].amount) * 100) / 100;
    }
    onPlanChange(payments);
  };

  const addCustom = () => {
    const newList = [...customPayments, { id: generateId(), amount: 0, due_date: "", status: "pendiente" }];
    setCustomPayments(newList);
    onPlanChange(newList);
  };

  const updateCustom = (idx, field, val) => {
    const updated = customPayments.map((p, i) => i === idx ? { ...p, [field]: field === "amount" ? parseFloat(val) || 0 : val } : p);
    setCustomPayments(updated);
    onPlanChange(updated);
  };

  const removeCustom = (idx) => {
    const updated = customPayments.filter((_, i) => i !== idx);
    setCustomPayments(updated);
    onPlanChange(updated);
  };

  const customTotal = customPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const count = parseInt(numPayments) || 1;
  const amountPer = count > 0 ? Math.round((balance / count) * 100) / 100 : 0;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Plan de pagos <span className="text-muted-foreground font-normal">(opcional)</span></label>

      {/* Selector */}
      <div className="grid grid-cols-2 gap-2">
        {FREQ_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => handleFreqChange(o.value)}
            className={`text-xs px-3 py-2 rounded-xl border text-left transition-colors font-medium
              ${freq === o.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Auto-generate: weekly / biweekly / monthly / single */}
      {(freq === "weekly" || freq === "biweekly" || freq === "monthly" || freq === "single") && (
        <div className="space-y-2 bg-muted/40 rounded-xl p-3">
          {freq !== "single" && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Número de pagos</label>
              <Input
                type="number"
                min="1"
                max="24"
                value={numPayments}
                onChange={(e) => setNumPayments(e.target.value)}
                className="h-8 text-sm"
              />
              {amountPer > 0 && (
                <p className="text-xs text-emerald-600 font-medium">≈ ${amountPer.toLocaleString()} por pago</p>
              )}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Fecha del primer pago</label>
            <Input
              type="date"
              value={firstDate}
              onChange={(e) => setFirstDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full h-8"
            onClick={() => {
              if (freq === "single") {
                onPlanChange([{ id: generateId(), amount: balance, due_date: firstDate, status: "pendiente" }]);
              } else {
                handleGenerate();
              }
            }}
            disabled={!firstDate || (freq !== "single" && !numPayments)}
          >
            <Calendar className="w-3.5 h-3.5 mr-1" /> Generar calendario
          </Button>
        </div>
      )}

      {/* Custom */}
      {freq === "custom" && (
        <div className="space-y-2 bg-muted/40 rounded-xl p-3">
          {customPayments.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="$"
                value={p.amount || ""}
                onChange={(e) => updateCustom(i, "amount", e.target.value)}
                className="h-8 text-sm flex-1"
              />
              <Input
                type="date"
                value={p.due_date}
                onChange={(e) => updateCustom(i, "due_date", e.target.value)}
                className="h-8 text-sm flex-1"
              />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeCustom(i)}>
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={addCustom}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Agregar pago
            </Button>
            {customTotal > 0 && (
              <p className={`text-xs font-medium ${Math.abs(customTotal - balance) < 0.01 ? "text-emerald-600" : "text-rose-500"}`}>
                Total: ${customTotal.toLocaleString()} {Math.abs(customTotal - balance) > 0.01 ? `(falta $${(balance - customTotal).toLocaleString()})` : "✓"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}