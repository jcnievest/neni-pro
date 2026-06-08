import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function RecoverClientsSection({ orders }) {
  const catalogUrl = `${window.location.origin}/catalogo`;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  // Aggregate by client, find last order date
  const clientMap = {};
  orders.forEach((o) => {
    if (o.status === "cancelado" || !o.client_id) return;
    if (!clientMap[o.client_id]) {
      clientMap[o.client_id] = {
        id: o.client_id,
        name: o.client_name || "Sin nombre",
        phone: o.client_phone,
        total: 0,
        lastDate: o.created_date,
      };
    }
    clientMap[o.client_id].total += o.total || 0;
    if (o.created_date > clientMap[o.client_id].lastDate) {
      clientMap[o.client_id].lastDate = o.created_date;
    }
  });

  const inactive = Object.values(clientMap)
    .filter((c) => c.lastDate < cutoffStr)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  if (inactive.length === 0) return null;

  const sendMsg = (client) => {
    const msg = `Hola ${client.name}, te comparto algunas novedades que tengo disponibles. Puedes verlas aquí: ${catalogUrl}. Si algo te gusta, con gusto te atiendo.`;
    if (client.phone) {
      const phone = client.phone.replace(/\D/g, "");
      const fullPhone = phone.length === 10 ? `52${phone}` : phone;
      window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      navigator.clipboard.writeText(msg);
      toast.success("Mensaje copiado al portapapeles");
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="font-display font-semibold text-sm">Clientes por recuperar</h3>
      <div className="space-y-2">
        {inactive.map((c) => {
          const lastDateFormatted = c.lastDate
            ? format(new Date(c.lastDate + "T12:00:00"), "d MMM yyyy", { locale: es })
            : "—";
          return (
            <Card key={c.id} className="p-3 border-0 shadow-sm bg-violet-50/40">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Última compra: {lastDateFormatted} · ${c.total.toLocaleString()} histórico
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs shrink-0 border-violet-200 text-violet-700"
                  onClick={() => sendMsg(c)}
                >
                  {c.phone ? "Enviar mensaje" : "Copiar mensaje"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}