import { useState } from "react";
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, upsertSettings } from "@/api/entities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ShoppingBag, DollarSign, Truck, Heart, MessageCircle, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import PaymentCardConfig from "@/components/payment-card/PaymentCardConfig";
import AppearanceSettings from "@/components/AppearanceSettings";
import { useAuth } from "@/lib/AuthContext";

const staticTemplates = [
  {
    icon: ShoppingBag,
    title: "Confirmar pedido",
    color: "text-primary",
    bgColor: "bg-primary/10",
    message:
      "¡Hola! 🛍️ Tu pedido ha sido confirmado. En cuanto tenga todo listo te aviso para coordinar la entrega. ¡Gracias por tu confianza!",
  },
  {
    icon: DollarSign,
    title: "Recordar pago",
    color: "text-rose-500",
    bgColor: "bg-rose-50",
    message:
      "Hola, te recuerdo que tienes un saldo pendiente de tu pedido. ¿Me confirmas por favor cuándo podrías liquidarlo? Gracias.",
  },
  {
    icon: Truck,
    title: "Avisar entrega",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    message:
      "¡Hola! 📦 Tu pedido ya está listo para entregarse. ¿Cuándo te queda bien que te lo lleve o pases por él? ¡Gracias!",
  },
  {
    icon: Heart,
    title: "Agradecer compra",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    message:
      "¡Muchas gracias por tu compra! 💖 Espero que te encante. Si necesitas algo más, con toda confianza me dices. ¡Bonito día!",
  },
];

export default function QuickMessages() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { hash } = useLocation();
  const [editingPhone, setEditingPhone] = useState(false);
  const [draftPhone, setDraftPhone] = useState("");
  const [editingShop, setEditingShop] = useState(false);
  const [draftShopName, setDraftShopName] = useState("");
  const [draftShopDesc, setDraftShopDesc] = useState("");

  const { data: settingsList = [] } = useQuery({
    queryKey: ["settings", user.id],
    queryFn: () => getSettings(),
  });
  const settings = settingsList[0] || {};

  const saveMut = useMutation({
    mutationFn: (data) => upsertSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Guardado");
    },
    onError: error => toast.error(error.message || 'No se pudo guardar la configuración.'),
  });

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Mensaje copiado");
  };

  const catalogPhone = settings.whatsapp_phone || "";

  const startEditPhone = () => { setDraftPhone(catalogPhone); setEditingPhone(true); };
  const savePhone = () => { saveMut.mutate({ whatsapp_phone: draftPhone }); setEditingPhone(false); };

  const startEditShop = () => {
    setDraftShopName(settings.shop_name || "");
    setDraftShopDesc(settings.shop_description || "");
    setEditingShop(true);
  };
  const saveShop = () => {
    saveMut.mutate({ shop_name: draftShopName, shop_description: draftShopDesc });
    setEditingShop(false);
  };

  if (hash === '#solicitudes-catalogo') return <Navigate to="/mi-catalogo#solicitudes-catalogo" replace />;

  return (
    <div className="space-y-4">
      <AppearanceSettings />
      <p className="text-sm text-muted-foreground">
        Plantillas listas para copiar y pegar en WhatsApp o Facebook.
      </p>

      {/* Tarjeta de cobro */}
      <PaymentCardConfig />

      {/* Datos generales: se comparten con el catálogo sin campos duplicados. */}
      <Card className="p-4 border-0 shadow-sm space-y-3 bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold text-sm">Datos del negocio</h3>
          </div>
          {!editingShop && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={startEditShop}>
              <Pencil className="w-3 h-3" />
            </Button>
          )}
        </div>

        {editingShop ? (
          <div className="space-y-2">
            <Input
              value={draftShopName}
              onChange={(e) => setDraftShopName(e.target.value)}
              placeholder="Nombre de tu tienda, ej: Boutique Sofía"
              className="h-8 text-sm"
            />
            <Input
              value={draftShopDesc}
              onChange={(e) => setDraftShopDesc(e.target.value)}
              placeholder="Descripción corta, ej: Ropa y accesorios para ti"
              className="h-8 text-sm"
            />
            <Button size="sm" className="w-full h-8" onClick={saveShop}>
              <Check className="w-3.5 h-3.5 mr-1" /> Guardar
            </Button>
          </div>
        ) : (
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{settings.shop_name || <span className="text-muted-foreground italic">Sin nombre de tienda</span>}</p>
            {settings.shop_description && <p className="text-xs text-muted-foreground">{settings.shop_description}</p>}
          </div>
        )}
      </Card>

      {/* Contacto general */}
      <Card className="p-4 border-0 shadow-sm space-y-3 bg-emerald-50/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="font-semibold text-sm">Contacto del negocio</h3>
        </div>

        {/* Teléfono */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Tu número de WhatsApp</p>
          {editingPhone ? (
            <div className="flex gap-2">
              <Input
                value={draftPhone}
                onChange={(e) => setDraftPhone(e.target.value)}
                placeholder="Ej: 5512345678"
                className="h-8 text-sm"
              />
              <Button size="sm" className="h-8 px-3" onClick={savePhone}>
                <Check className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm">{catalogPhone || <span className="text-muted-foreground italic">Sin número configurado</span>}</p>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={startEditPhone}>
                <Pencil className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

      </Card>

      {/* Static templates */}
      {staticTemplates.map((t, i) => (
        <Card key={i} className="p-4 border-0 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${t.bgColor} flex items-center justify-center`}>
              <t.icon className={`w-4 h-4 ${t.color}`} />
            </div>
            <h3 className="font-semibold text-sm">{t.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.message}</p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => copyText(t.message)}
          >
            <Copy className="w-4 h-4 mr-2" /> Copiar mensaje
          </Button>
        </Card>
      ))}
    </div>
  );
}
