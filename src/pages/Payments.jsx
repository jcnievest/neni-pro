import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPaymentCard, getOrders, getClients, updateOrder } from "@/api/entities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, DollarSign, ChevronLeft, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, CreditCard } from "lucide-react";
import { useState as useLocalState } from "react";
import PaymentCardModal from "@/components/payment-card/PaymentCardModal";
import { Link } from "react-router-dom";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { addDays } from "date-fns";

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const FILTERS = [
  { value: "all", label: "Todos" },
  { value: "overdue", label: "Vencidos" },
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "no_date", label: "Sin fecha" },
];

function getEffectiveStatus(payment) {
  if (payment.status === "pagado") return "pagado";
  const today = new Date().toISOString().slice(0, 10);
  if (payment.due_date && payment.due_date < today) return "vencido";
  return "pendiente";
}

export default function Payments() {
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedOrders, setExpandedOrders] = useState({});
  const [paymentCardModal, setPaymentCardModal] = useLocalState(null); // { item }

  const { data: paymentCardList = [] } = useQuery({
    queryKey: ["payment_card"],
    queryFn: () => getPaymentCard(),
  });
  const paymentCardData = paymentCardList[0] || null;

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => getOrders("-created_date", 200),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients("name", 500),
  });

  const updateMut = useMutation({
    mutationFn: ({ orderId, plan, balance, status }) =>
      updateOrder(orderId, { payment_plan: plan, balance, status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Pago marcado como pagado ✓");
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = format(addDays(new Date(), 7), "yyyy-MM-dd");
  const monthEnd = format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), "yyyy-MM-dd");

  // Build flat list of plan payments + orders without plan
  const allPaymentItems = [];
  orders.forEach((order) => {
    if (order.status === "cancelado") return;
    if (order.payment_plan?.length > 0) {
      order.payment_plan.forEach((p) => {
        if (p.status === "pagado") return;
        allPaymentItems.push({ type: "plan", payment: p, order });
      });
    } else if ((order.balance || 0) > 0) {
      allPaymentItems.push({ type: "simple", order });
    }
  });

  // Filter
  const filtered = allPaymentItems.filter(({ type, payment, order }) => {
    if (activeFilter === "all") return true;
    const dueDate = type === "plan" ? payment.due_date : null;
    const effective = type === "plan" ? getEffectiveStatus(payment) : null;
    if (activeFilter === "overdue") return effective === "vencido";
    if (activeFilter === "today") return dueDate === today;
    if (activeFilter === "week") return dueDate && dueDate <= weekEnd && dueDate >= today;
    if (activeFilter === "month") return dueDate && dueDate <= monthEnd && dueDate >= today;
    if (activeFilter === "no_date") return !dueDate;
    return true;
  });

  // Sort: vencidos → hoy → próximos → sin fecha
  const sorted = filtered.sort((a, b) => {
    const da = a.type === "plan" ? a.payment.due_date : null;
    const db = b.type === "plan" ? b.payment.due_date : null;
    const ea = a.type === "plan" ? getEffectiveStatus(a.payment) : "pendiente";
    const eb = b.type === "plan" ? getEffectiveStatus(b.payment) : "pendiente";
    const order = { vencido: 0, pendiente: 1 };
    if (order[ea] !== order[eb]) return order[ea] - order[eb];
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.localeCompare(db);
  });

  const getClient = (ord) => clients.find((c) => c.id === ord.client_id);

  const getMsg = (item) => {
    if (item.type === "simple") {
      const o = item.order;
      return `Hola ${o.client_name}, te recuerdo que tienes pendiente un saldo de $${o.balance?.toLocaleString()} de tu pedido. ¿Me confirmas por favor cuándo podrías liquidarlo? Gracias.`;
    }
    const { payment: p, order: o } = item;
    const productName = o.items?.[0]?.product_name || "tu pedido";
    const dateStr = p.due_date ? format(new Date(p.due_date + "T12:00:00"), "d 'de' MMMM", { locale: es }) : "sin fecha";
    const effective = getEffectiveStatus(p);
    if (effective === "vencido") {
      return `Hola ${o.client_name}, te recuerdo que quedó pendiente tu pago de $${p.amount?.toLocaleString()} por ${productName}, programado para el ${dateStr}. ¿Me confirmas cuándo podrías realizarlo? Gracias.`;
    }
    return `Hola ${o.client_name}, te recuerdo que tu próximo pago de $${p.amount?.toLocaleString()} por ${productName} está programado para el ${dateStr}. Gracias.`;
  };

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success("Mensaje copiado"); };

  const openWhatsApp = (item) => {
    const phone = item.order.client_phone?.replace(/\D/g, "");
    if (!phone) { toast.error("Este cliente no tiene teléfono"); return; }
    const full = phone.length === 10 ? `52${phone}` : phone;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(getMsg(item))}`, "_blank");
  };

  const markPaid = (item) => {
    const { payment: p, order: o } = item;
    const updatedPlan = o.payment_plan.map((pp) =>
      pp.id === p.id ? { ...pp, status: "pagado", paid_date: today } : pp
    );
    const paidSum = updatedPlan.filter(pp => pp.status === "pagado").reduce((s, pp) => s + (pp.amount || 0), 0);
    const newBalance = Math.max(0, o.total - (o.advance || 0) - paidSum);
    const allPaid = updatedPlan.every(pp => pp.status === "pagado");
    const newStatus = allPaid ? (o.delivered ? "entregado" : "pagado") : o.status;
    updateMut.mutate({ orderId: o.id, plan: updatedPlan, balance: newBalance, status: newStatus });
  };

  const openInstagram = (client) => {
    if (!client?.instagram) { toast.error("Sin usuario de Instagram"); return; }
    window.open(`https://instagram.com/${client.instagram.replace("@", "")}`, "_blank");
  };
  const openFacebook = (client) => {
    if (!client?.facebook) { toast.error("Sin perfil de Facebook"); return; }
    const url = client.facebook.startsWith("http") ? client.facebook : `https://facebook.com/${client.facebook}`;
    window.open(url, "_blank");
  };

  const totalOverdue = sorted.filter(i => i.type === "plan" && getEffectiveStatus(i.payment) === "vencido").length;
  const totalPending = sorted.reduce((s, i) => s + (i.type === "plan" ? (i.payment.amount || 0) : (i.order.balance || 0)), 0);

  return (
    <div className="space-y-4">
      <Link to="/" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> Inicio
      </Link>

      {/* Summary bar */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-rose-50 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Por cobrar</p>
            <p className="text-lg font-bold text-rose-500">${totalPending.toLocaleString()}</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${totalOverdue > 0 ? "bg-rose-100" : "bg-amber-50"}`}>
            <p className="text-xs text-muted-foreground">Vencidos</p>
            <p className={`text-lg font-bold ${totalOverdue > 0 ? "text-rose-600" : "text-amber-600"}`}>{totalOverdue} pago{totalOverdue !== 1 ? "s" : ""}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full font-medium transition-colors shrink-0
              ${activeFilter === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={DollarSign} title="¡Todo cobrado!" description="No hay cobros pendientes en este filtro" />
      ) : (
        <div className="space-y-3">
          {sorted.map((item, idx) => {
            const o = item.order;
            const client = getClient(o);
            const isSimple = item.type === "simple";
            const effective = item.type === "plan" ? getEffectiveStatus(item.payment) : "pendiente";
            const amount = isSimple ? o.balance : item.payment.amount;
            const dueDate = item.type === "plan" ? item.payment.due_date : null;
            const showExpanded = expandedOrders[`${o.id}-${idx}`];

            return (
              <Card key={idx} className={`p-4 border-0 shadow-sm space-y-3 ${effective === "vencido" ? "border-l-4 border-l-rose-400" : effective === "pendiente" && dueDate === today ? "border-l-4 border-l-amber-400" : ""}`}>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{o.client_name}</p>
                    <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-muted-foreground">
                      {o.client_phone && <span>📱 {o.client_phone}</span>}
                      {dueDate && (
                        <span className={effective === "vencido" ? "text-rose-500 font-medium" : ""}>
                          📅 {format(new Date(dueDate + "T12:00:00"), "d 'de' MMMM", { locale: es })}
                        </span>
                      )}
                      {o.items?.[0]?.product_name && <span>🛍️ {o.items[0].product_name}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    {effective === "vencido" && (
                      <div className="flex items-center gap-1 text-rose-500 text-xs font-semibold mb-1">
                        <AlertCircle className="w-3 h-3" /> Vencido
                      </div>
                    )}
                    {effective === "pendiente" && dueDate === today && (
                      <div className="flex items-center gap-1 text-amber-600 text-xs font-semibold mb-1">
                        <Clock className="w-3 h-3" /> Hoy
                      </div>
                    )}
                    <p className="text-xl font-bold text-rose-500">${amount?.toLocaleString()}</p>
                  </div>
                </div>

                {/* Plan payment mark button */}
                {item.type === "plan" && (
                  <Button
                    size="sm"
                    className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    onClick={() => markPaid(item)}
                    disabled={updateMut.isPending}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Marcar como pagado
                  </Button>
                )}

                {/* Send payment data button */}
                {paymentCardData && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs border-primary/30 text-primary hover:bg-primary/5"
                    onClick={() => setPaymentCardModal({ item })}
                  >
                    <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Enviar datos de pago
                  </Button>
                )}

                {/* Expandable contact section */}
                <button
                  className="w-full flex items-center justify-between text-xs text-muted-foreground"
                  onClick={() => setExpandedOrders(prev => ({ ...prev, [`${o.id}-${idx}`]: !showExpanded }))}
                >
                  <span>Enviar recordatorio</span>
                  {showExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showExpanded && (
                  <div className="space-y-2 pt-1 border-t border-border/50">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => copy(getMsg(item))}>
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copiar
                      </Button>
                      <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => openWhatsApp(item)} disabled={!o.client_phone}>
                        <WhatsAppIcon /> <span className="ml-1">WhatsApp</span>
                      </Button>
                    </div>
                    {(client?.instagram || client?.facebook) && (
                      <div className="flex gap-2">
                        {client?.instagram && (
                          <Button size="sm" variant="outline" className="flex-1 border-pink-200 text-pink-600 hover:bg-pink-50" onClick={() => openInstagram(client)}>
                            <InstagramIcon /> <span className="ml-1">Instagram</span>
                          </Button>
                        )}
                        {client?.facebook && (
                          <Button size="sm" variant="outline" className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => openFacebook(client)}>
                            <FacebookIcon /> <span className="ml-1">Facebook</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {paymentCardModal && paymentCardData && (
        <PaymentCardModal
          cardData={paymentCardData}
          clientName={paymentCardModal.item.order.client_name}
          amount={paymentCardModal.item.type === "plan" ? paymentCardModal.item.payment.amount : paymentCardModal.item.order.balance}
          productName={paymentCardModal.item.order.items?.[0]?.product_name}
          dueDate={paymentCardModal.item.type === "plan" && paymentCardModal.item.payment.due_date
            ? new Date(paymentCardModal.item.payment.due_date + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long" })
            : null}
          onClose={() => setPaymentCardModal(null)}
        />
      )}
    </div>
  );
}