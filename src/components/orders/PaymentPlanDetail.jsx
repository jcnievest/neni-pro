import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { getPaymentCard, updateOrder } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, Clock, AlertCircle, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import PaymentCardModal from "@/components/payment-card/PaymentCardModal";
import { useAuth } from "@/lib/AuthContext";

const WAIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

function statusConfig(status) {
  if (status === "pagado") return { label: "Pagado", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 };
  if (status === "vencido") return { label: "Vencido", color: "text-rose-500", bg: "bg-rose-50", icon: AlertCircle };
  return { label: "Pendiente", color: "text-amber-600", bg: "bg-amber-50", icon: Clock };
}

function getEffectiveStatus(payment) {
  if (payment.status === "pagado") return "pagado";
  if (payment.due_date && payment.due_date < new Date().toISOString().slice(0, 10)) return "vencido";
  return "pendiente";
}

export default function PaymentPlanDetail({ order }) {
  const qc = useQueryClient();
  const { accessState } = useAuth();
  const canUseActions = accessState.hasAccess;
  const plan = order.payment_plan || [];
  const today = new Date().toISOString().slice(0, 10);
  const [cardModal, setCardModal] = useState(null);

  const { data: paymentCardList = [] } = useQuery({
    queryKey: ["payment_card"],
    queryFn: () => getPaymentCard(),
  });
  const paymentCardData = paymentCardList[0] || null;

  const updateMut = useMutation({
    mutationFn: (updatedPlan) => updateOrder(order.id, { payment_plan: updatedPlan }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });

  const markPaid = (paymentId) => {
    const updatedPlan = plan.map((p) =>
      p.id === paymentId ? { ...p, status: "pagado", paid_date: today } : p
    );
    updateMut.mutate(updatedPlan);
    // Also recalculate balance on order
    const paidSum = updatedPlan.filter(p => p.status === "pagado").reduce((s, p) => s + (p.amount || 0), 0);
    const newBalance = Math.max(0, order.total - (order.advance || 0) - paidSum);
    const allPaid = updatedPlan.every(p => p.status === "pagado");
    const newStatus = allPaid ? (order.delivered ? "entregado" : "pagado") : order.status;
    updateOrder(order.id, { balance: newBalance, status: newStatus });
    toast.success("Pago marcado como pagado ✓");
  };

  const getMsg = (p) => {
    const effective = getEffectiveStatus(p);
    const productName = order.items?.[0]?.product_name || "tu pedido";
    const dateStr = p.due_date ? format(new Date(p.due_date + "T12:00:00"), "d 'de' MMMM", { locale: es }) : "sin fecha";
    if (effective === "vencido") {
      return `Hola ${order.client_name}, te recuerdo que quedó pendiente tu pago de $${p.amount?.toLocaleString()} por ${productName}, programado para el ${dateStr}. ¿Me confirmas cuándo podrías realizarlo? Gracias.`;
    }
    return `Hola ${order.client_name}, te recuerdo que tu próximo pago de $${p.amount?.toLocaleString()} por ${productName} está programado para el ${dateStr}. Gracias.`;
  };

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success("Recordatorio copiado"); };
  const openWA = (p) => {
    const phone = order.client_phone?.replace(/\D/g, "");
    if (!phone) { toast.error("Sin teléfono"); return; }
    const full = phone.length === 10 ? `52${phone}` : phone;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(getMsg(p))}`, "_blank");
  };

  if (plan.length === 0) return null;

  const paidSum = plan.filter(p => p.status === "pagado").reduce((s, p) => s + (p.amount || 0), 0);
  const pendingSum = plan.filter(p => p.status !== "pagado").reduce((s, p) => s + (p.amount || 0), 0);
  const nextPayment = plan.filter(p => p.status !== "pagado" && p.due_date).sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const overdueCount = plan.filter(p => getEffectiveStatus(p) === "vencido").length;

  return (
    <div className="space-y-3">
      <h3 className="font-display font-semibold text-sm">Plan de pagos</h3>

      {cardModal && paymentCardData && (
        <PaymentCardModal
          cardData={paymentCardData}
          clientName={order.client_name}
          amount={cardModal.amount}
          productName={order.items?.[0]?.product_name}
          dueDate={cardModal.due_date ? format(new Date(cardModal.due_date + "T12:00:00"), "d 'de' MMMM", { locale: es }) : null}
          onClose={() => setCardModal(null)}
        />
      )}

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-rose-50 rounded-xl p-2">
          <p className="text-xs text-muted-foreground">Pendiente</p>
          <p className="text-sm font-bold text-rose-500">${pendingSum.toLocaleString()}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-2">
          <p className="text-xs text-muted-foreground">Cobrado</p>
          <p className="text-sm font-bold text-emerald-600">${paidSum.toLocaleString()}</p>
        </div>
        <div className={`rounded-xl p-2 ${overdueCount > 0 ? "bg-rose-100" : "bg-amber-50"}`}>
          <p className="text-xs text-muted-foreground">Vencidos</p>
          <p className={`text-sm font-bold ${overdueCount > 0 ? "text-rose-600" : "text-amber-600"}`}>{overdueCount}</p>
        </div>
      </div>

      {nextPayment && (
        <div className="flex items-center gap-2 bg-primary/5 rounded-xl px-3 py-2">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            Próximo pago: <span className="font-semibold text-foreground">${nextPayment.amount?.toLocaleString()}</span>
            {nextPayment.due_date && ` · ${format(new Date(nextPayment.due_date + "T12:00:00"), "d 'de' MMMM", { locale: es })}`}
          </p>
        </div>
      )}

      {/* Payment rows */}
      <div className="space-y-2">
        {plan.map((p, i) => {
          const effective = getEffectiveStatus(p);
          const cfg = statusConfig(effective);
          const Icon = cfg.icon;
          return (
            <div key={p.id || i} className={`rounded-xl border p-3 space-y-2 ${effective === "vencido" ? "border-rose-200 bg-rose-50/30" : effective === "pagado" ? "border-emerald-200 bg-emerald-50/30" : "border-border bg-card"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                  <div>
                    <p className="text-sm font-semibold">${p.amount?.toLocaleString()}</p>
                    {p.due_date && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(p.due_date + "T12:00:00"), "d 'de' MMMM yyyy", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
              {canUseActions && effective !== "pagado" && (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                      onClick={() => copy(getMsg(p))}
                    >
                      <Copy className="w-3 h-3 mr-1" /> Copiar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => openWA(p)}
                      disabled={!order.client_phone}
                    >
                      <WAIcon /> <span className="ml-1">WhatsApp</span>
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => markPaid(p.id)}
                      disabled={updateMut.isPending}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Pagado
                    </Button>
                  </div>
                  {paymentCardData && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-xs border-primary/30 text-primary hover:bg-primary/5"
                      onClick={() => setCardModal(p)}
                    >
                      <CreditCard className="w-3 h-3 mr-1" /> Enviar datos de pago
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
