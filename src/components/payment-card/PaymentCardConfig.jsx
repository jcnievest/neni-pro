import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPaymentCard, upsertPaymentCard } from "@/api/entities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, ShieldAlert, Info, CreditCard } from "lucide-react";
import { toast } from "sonner";
import PaymentCardPreview from "./PaymentCardPreview";
import PaymentCardModal from "./PaymentCardModal";

const COLORS = [
  { value: "rose", label: "Rosa", bg: "bg-rose-500" },
  { value: "violet", label: "Violeta", bg: "bg-violet-500" },
  { value: "sky", label: "Azul", bg: "bg-sky-500" },
  { value: "emerald", label: "Verde", bg: "bg-emerald-500" },
  { value: "amber", label: "Ámbar", bg: "bg-amber-500" },
  { value: "slate", label: "Gris", bg: "bg-slate-500" },
];

export default function PaymentCardConfig() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [draft, setDraft] = useState({});

  const { data: list = [] } = useQuery({
    queryKey: ["payment_card"],
    queryFn: () => getPaymentCard(),
  });
  const cardData = list[0] || {};

  const saveMut = useMutation({
    mutationFn: (data) => upsertPaymentCard(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment_card"] });
      toast.success("Datos guardados");
      setEditing(false);
    },
  });

  const startEdit = () => {
    setDraft({
      shop_name: cardData.shop_name || "",
      holder_name: cardData.holder_name || "",
      bank: cardData.bank || "",
      clabe: cardData.clabe || "",
      card_number: cardData.card_number || "",
      phone: cardData.phone || "",
      payment_note: cardData.payment_note || "",
      card_color: cardData.card_color || "rose",
    });
    setEditing(true);
  };

  const hasData = cardData.bank || cardData.clabe || cardData.holder_name;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className="p-4 border-0 shadow-sm space-y-3 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Tarjeta de cobro</h3>
              <p className="text-xs text-muted-foreground">Datos para transferencia</p>
            </div>
          </div>
          {!editing && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={startEdit}>
              <Pencil className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Info banner */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex gap-2">
          <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
          <p className="text-xs text-sky-700 leading-relaxed">
            Estos datos se usarán para generar una imagen que podrás enviar a tus clientes para que te hagan transferencia.
          </p>
        </div>

        {editing ? (
          <div className="space-y-2">
            <Input value={draft.shop_name} onChange={e => setDraft(d => ({ ...d, shop_name: e.target.value }))} placeholder="Nombre del negocio (ej: Boutique Sofía)" className="h-9 text-sm" />
            <Input value={draft.holder_name} onChange={e => setDraft(d => ({ ...d, holder_name: e.target.value }))} placeholder="Nombre del titular de la cuenta *" className="h-9 text-sm" />
            <Input value={draft.bank} onChange={e => setDraft(d => ({ ...d, bank: e.target.value }))} placeholder="Banco (ej: BBVA, Banorte, Santander…) *" className="h-9 text-sm" />
            <Input value={draft.clabe} onChange={e => setDraft(d => ({ ...d, clabe: e.target.value }))} placeholder="CLABE interbancaria (18 dígitos) *" className="h-9 text-sm" maxLength={18} />
            <Input value={draft.card_number} onChange={e => setDraft(d => ({ ...d, card_number: e.target.value }))} placeholder="Número de tarjeta (opcional)" className="h-9 text-sm" maxLength={19} />
            <Input value={draft.phone} onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))} placeholder="Teléfono de contacto para pagos" className="h-9 text-sm" />
            <textarea
              value={draft.payment_note}
              onChange={e => setDraft(d => ({ ...d, payment_note: e.target.value }))}
              placeholder="Nota opcional (ej: Envía tu comprobante por WhatsApp)"
              rows={2}
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Color de la tarjeta</p>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setDraft(d => ({ ...d, card_color: c.value }))}
                    className={`w-7 h-7 rounded-full ${c.bg} ${draft.card_color === c.value ? "ring-2 ring-offset-2 ring-foreground/50" : ""}`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button size="sm" className="flex-1" onClick={() => saveMut.mutate(draft)} disabled={saveMut.isPending}>
                <Check className="w-3.5 h-3.5 mr-1" /> Guardar
              </Button>
            </div>
          </div>
        ) : hasData ? (
          <div className="space-y-1 text-sm">
            {cardData.shop_name && <p className="font-medium">{cardData.shop_name}</p>}
            {cardData.holder_name && <p className="text-muted-foreground">Titular: {cardData.holder_name}</p>}
            {cardData.bank && <p className="text-muted-foreground">Banco: {cardData.bank}</p>}
            {cardData.clabe && <p className="text-muted-foreground">CLABE: •••• •••• •••• {cardData.clabe.slice(-4)}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Sin datos configurados. Toca el lápiz para agregar.</p>
        )}
      </Card>

      {/* Preview + generate */}
      {hasData && (
        <>
          <PaymentCardPreview cardData={cardData} />
          <Button
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            onClick={() => setShowModal(true)}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Generar tarjeta de cobro
          </Button>
        </>
      )}

      {/* Security notices */}
      <Card className="p-3 border border-amber-200 bg-amber-50/60 space-y-1">
        <div className="flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-amber-800">Aviso de seguridad</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Nunca compartas CVV, NIP, contraseñas, token bancario ni datos de acceso a tu banca.
            </p>
            <p className="text-xs text-amber-700 leading-relaxed">
              La app solo te ayuda a mostrar tus datos para recibir transferencias. No procesa pagos, no valida depósitos y no se conecta con bancos.
            </p>
            <p className="text-xs text-amber-700 leading-relaxed font-medium">
              Verifica siempre el comprobante directamente en tu banco antes de entregar productos.
            </p>
          </div>
        </div>
      </Card>

      {showModal && (
        <PaymentCardModal cardData={cardData} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}