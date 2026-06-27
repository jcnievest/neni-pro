import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClients, getProducts, createClient, createOrder, createProduct } from "@/api/entities";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, ChevronDown, UserPlus } from "lucide-react";
import { toast } from "sonner";
import PaymentPlanForm from "@/components/orders/PaymentPlanForm";

// Step indicator
function Step({ number, label, active, done }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
        ${done ? "bg-primary text-primary-foreground" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {done ? "✓" : number}
      </div>
      <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}

export default function NewOrder() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);

  // Step 1 — client
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  // Step 2 — items (free text lines)
  const [lines, setLines] = useState([{ desc: "", qty: "1", price: "", cost: "", saveTocatalog: false }]);

  // Step 3 — totals & date
  const [manualTotal, setManualTotal] = useState("");
  const [advance, setAdvance] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentPlan, setPaymentPlan] = useState([]);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients("name", 500),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts("name", 500),
  });

  const createClientMut = useMutation({
    mutationFn: (data) => createClient(data),
    onSuccess: (newClient) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setClientId(newClient.id);
      setClientName(newClient.name);
      setClientPhone(newClient.phone || "");
      setCreatingClient(false);
      setStep(2);
    },
  });

  const createOrderMut = useMutation({
    mutationFn: (data) => createOrder(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("¡Pedido guardado! 🎉");
      navigate("/pedidos");
    },
  });

  const filteredClients = clients.filter(
    (c) =>
      c.name?.toLowerCase().includes(clientQuery.toLowerCase()) ||
      c.phone?.includes(clientQuery)
  );

  const autoTotal = lines.reduce((s, l) => s + (parseFloat(l.qty) || 1) * (parseFloat(l.price) || 0), 0);
  const displayTotal = manualTotal !== "" ? parseFloat(manualTotal) || 0 : autoTotal;
  const balance = displayTotal - (parseFloat(advance) || 0);

  const addLine = () => setLines([...lines, { desc: "", qty: "1", price: "", cost: "" }]);
  const removeLine = (i) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i, field, val) => setLines(lines.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

  const selectProduct = (p) => {
    const emptyIdx = lines.findIndex((l) => !l.desc && !l.price);
    const newLine = { desc: p.name, qty: "1", price: String(p.price), cost: p.cost != null ? String(p.cost) : "" };
    if (emptyIdx >= 0) {
      setLines(lines.map((l, i) => i === emptyIdx ? newLine : l));
    } else {
      setLines([...lines, newLine]);
    }
  };
  const handleSave = async () => {
    const filledLines = lines.filter((l) => l.desc.trim());
    if (!clientName) { toast.error("Elige o escribe el nombre del cliente"); return; }
    if (filledLines.length === 0) { toast.error("Agrega al menos un producto"); return; }

    const items = filledLines.map((l) => ({
      product_name: l.desc,
      quantity: parseFloat(l.qty) || 1,
      unit_price: parseFloat(l.price) || 0,
      unit_cost: parseFloat(l.cost) || 0,
      subtotal: (parseFloat(l.qty) || 1) * (parseFloat(l.price) || 0),
    }));

    const totalCostCalc = items.reduce((s, i) => s + (i.unit_cost || 0) * i.quantity, 0);
    const adv = parseFloat(advance) || 0;
    const status = balance <= 0 ? "pagado" : adv > 0 ? "apartado" : "pendiente_pago";

    // Assign IDs to payment plan items if needed
    const planWithIds = paymentPlan.map((p) => ({
      ...p,
      id: p.id || Math.random().toString(36).slice(2, 9),
    }));
// Guardar líneas nuevas en catálogo si se marcó el checkbox
const linesToSave = filledLines.filter((l) => l.saveToProduct);
for (const l of filledLines.filter((l) => l.saveToProduct)) {
  await createProduct({
    name: l.desc,
    price: parseFloat(l.price) || 0,
    cost: parseFloat(l.cost) || 0,
  });
}
    createOrderMut.mutate({
      client_id: clientId || null,
      client_name: clientName,
      client_phone: clientPhone,
      items,
      total: displayTotal,
      advance: parseFloat(advance) || 0,
      balance: Math.max(0, balance),
      total_cost: totalCostCalc,
      delivery_date: deliveryDate || null,
      status,
      notes,
      delivered: false,
      payment_plan: planWithIds,
    });
  };

  return (
    <div className="space-y-5 pb-4">
      {/* Steps indicator */}
      <div className="flex items-center gap-4 px-1">
        <Step number={1} label="Cliente" active={step === 1} done={step > 1} />
        <div className="h-px flex-1 bg-border" />
        <Step number={2} label="Productos" active={step === 2} done={step > 2} />
        <div className="h-px flex-1 bg-border" />
        <Step number={3} label="Cobro" active={step === 3} done={false} />
      </div>

      {/* ─── STEP 1: Cliente ─── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <p className="text-lg font-display font-bold mb-1">¿Para quién es el pedido?</p>
            <p className="text-sm text-muted-foreground">Busca un cliente o escribe el nombre</p>
          </div>

          {clientName && !showClientSearch ? (
            <div className="flex items-center justify-between bg-primary/10 rounded-xl px-4 py-3">
              <div>
                <p className="font-semibold text-sm">{clientName}</p>
                {clientPhone && <p className="text-xs text-muted-foreground">{clientPhone}</p>}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setClientName(""); setClientId(""); setClientPhone(""); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                placeholder="Escribe el nombre del cliente..."
                value={clientQuery}
                autoFocus
                onChange={(e) => { setClientQuery(e.target.value); setShowClientSearch(true); }}
              />
              {clientQuery && (
                <div className="space-y-2">
                  {filteredClients.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-4 py-3 rounded-xl bg-card shadow-sm border border-border hover:border-primary/50 transition-colors"
                      onClick={() => {
                        setClientId(c.id);
                        setClientName(c.name);
                        setClientPhone(c.phone || "");
                        setClientQuery("");
                        setShowClientSearch(false);
                      }}
                    >
                      <p className="font-medium text-sm">{c.name}</p>
                      {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                    </button>
                  ))}
                  {/* Quick create */}
                  {!creatingClient && (
                    <button
                      type="button"
                      className="w-full text-left px-4 py-3 rounded-xl border border-dashed border-primary/40 hover:border-primary transition-colors flex items-center gap-2 text-primary"
                      onClick={() => { setCreatingClient(true); }}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span className="text-sm font-medium">Crear "{clientQuery}" como cliente nuevo</span>
                    </button>
                  )}
                </div>
              )}

              {creatingClient && (
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold">Nuevo cliente</p>
                  <Input
                    placeholder="Nombre"
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                  />
                  <Input
                    placeholder="Teléfono (opcional)"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    type="tel"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setCreatingClient(false)}>Cancelar</Button>
                    <Button size="sm" className="flex-1" onClick={() => createClientMut.mutate({ name: clientQuery, phone: clientPhone, tag: "nuevo" })}>
                      {createClientMut.isPending ? "..." : "Guardar cliente"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Allow continuing with just a name */}
              {clientQuery && !creatingClient && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setClientName(clientQuery);
                    setClientQuery("");
                    setShowClientSearch(false);
                  }}
                >
                  Continuar como "{clientQuery}"
                </Button>
              )}
            </div>
          )}

          <Button
            className="w-full"
            disabled={!clientName}
            onClick={() => setStep(2)}
          >
            Siguiente →
          </Button>
        </div>
      )}

      {/* ─── STEP 2: Productos ─── */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <p className="text-lg font-display font-bold mb-1">¿Qué lleva el pedido?</p>
            <p className="text-sm text-muted-foreground">Agrega los productos o escríbelos a mano</p>
          </div>

          {/* Quick-add from catalog */}
          {products.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Tus productos</p>
              <div className="flex flex-wrap gap-2">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProduct(p)}
                    className="text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors font-medium"
                  >
                    {p.name} · ${p.price?.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual lines */}
          <div className="space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Producto o descripción"
                    value={line.desc}
                    onChange={(e) => updateLine(i, "desc", e.target.value)}
                    className="flex-[3]"
                  />
                  <Input
                    placeholder="Cant"
                    type="number" inputMode="decimal"
                    min="1"
                    value={line.qty}
                    onChange={(e) => updateLine(i, "qty", e.target.value)}
                    className="flex-[1] text-center"
                  />
                  <Input
                    placeholder="Precio $"
                    type="number" inputMode="decimal"
                    min="0"
                    value={line.price}
                    onChange={(e) => updateLine(i, "price", e.target.value)}
                    className="flex-[1.5]"
                  />
                  {lines.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground" onClick={() => removeLine(i)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {/* Solo mostrar costo si el producto NO viene del catálogo (no tiene cost prefilled) o si está vacío */}
                {line.desc && (
                  <div className="space-y-1.5 pl-1">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Costo estimado (opcional)"
                        type="number" inputMode="decimal"
                        min="0"
                        value={line.cost}
                        onChange={(e) => updateLine(i, "cost", e.target.value)}
                        className="h-7 text-xs text-muted-foreground"
                      />
                      {line.price && line.cost && (
                        <span className="text-xs text-emerald-600 font-medium whitespace-nowrap shrink-0">
                          Ganas: ${(((parseFloat(line.qty) || 1) * (parseFloat(line.price) || 0)) - ((parseFloat(line.qty) || 1) * (parseFloat(line.cost) || 0))).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer w-fit">
                      <input
                        type="checkbox"
                        checked={line.saveTocatalog || false}
                        onChange={(e) => updateLine(i, "saveTocatalog", e.target.checked)}
                        className="w-3.5 h-3.5 accent-pink-500"
                      />
                      <span className="text-xs text-muted-foreground">Guardar en catálogo</span>
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" size="sm" className="w-full" onClick={addLine}>
            <Plus className="w-4 h-4 mr-1" /> Agregar línea
          </Button>

          {autoTotal > 0 && (
            <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-primary/10">
              <span className="text-sm font-medium">Total calculado</span>
              <span className="text-lg font-bold text-primary">${autoTotal.toLocaleString()}</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>← Atrás</Button>
            <Button
              className="flex-[2]"
              disabled={!lines.some((l) => l.desc.trim())}
              onClick={() => { if (autoTotal > 0) setManualTotal(""); setStep(3); }}
            >
              Siguiente →
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Cobro y fecha ─── */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <p className="text-lg font-display font-bold mb-1">¿Cómo queda el cobro?</p>
            <p className="text-sm text-muted-foreground">Captura el total, anticipo y fecha de entrega</p>
          </div>

          {/* Total — editable, pre-filled from lines */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Total del pedido</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
              <Input
                type="number" inputMode="decimal"
                min="0"
                placeholder="0"
                value={manualTotal !== "" ? manualTotal : autoTotal || ""}
                onChange={(e) => setManualTotal(e.target.value)}
                className="pl-7 text-lg font-bold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Anticipo recibido <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
              <Input
                type="number" inputMode="decimal"
                min="0"
                placeholder="0"
                value={advance}
                onChange={(e) => setAdvance(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          {/* Saldo visual */}
          <div className={`flex justify-between items-center px-4 py-3 rounded-xl ${balance <= 0 ? "bg-emerald-50" : "bg-rose-50"}`}>
            <span className="text-sm font-medium">Saldo pendiente</span>
            <span className={`text-lg font-bold ${balance <= 0 ? "text-emerald-600" : "text-rose-500"}`}>
              ${Math.max(0, balance).toLocaleString()}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Fecha de entrega <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Notas <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <Textarea
              placeholder="Ej: color, talla, instrucciones especiales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Payment plan — only if there's a pending balance */}
          {balance > 0 && (
            <PaymentPlanForm balance={Math.max(0, balance)} onPlanChange={setPaymentPlan} />
          )}

          {/* Plan preview */}
          {paymentPlan.length > 0 && (
            <div className="bg-muted/40 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Calendario generado</p>
              {paymentPlan.map((p, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Pago {i + 1} · {p.due_date || "sin fecha"}</span>
                  <span className="font-medium">${p.amount?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          <div className="bg-muted/60 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resumen del pedido</p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span className="font-medium">{clientName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Productos</span><span className="font-medium">{lines.filter(l => l.desc).length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold">${displayTotal.toLocaleString()}</span></div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>← Atrás</Button>
            <Button
              className="flex-[2]"
              disabled={createOrderMut.isPending || displayTotal <= 0}
              onClick={handleSave}
            >
              {createOrderMut.isPending ? "Guardando..." : "💾 Guardar pedido"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
