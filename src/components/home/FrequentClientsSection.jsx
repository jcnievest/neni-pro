import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function FrequentClientsSection({ orders }) {
  // Aggregate by client
  const clientMap = {};
  orders.forEach((o) => {
    if (o.status === "cancelado" || !o.client_id) return;
    if (!clientMap[o.client_id]) {
      clientMap[o.client_id] = {
        id: o.client_id,
        name: o.client_name || "Sin nombre",
        phone: o.client_phone,
        count: 0,
        total: 0,
        lastDate: o.created_date,
      };
    }
    clientMap[o.client_id].count += 1;
    clientMap[o.client_id].total += o.total || 0;
    if (o.created_date > clientMap[o.client_id].lastDate) {
      clientMap[o.client_id].lastDate = o.created_date;
    }
  });

  const top3 = Object.values(clientMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  if (top3.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-display font-semibold text-sm">Clientes frecuentes</h3>
      <div className="space-y-2">
        {top3.map((c) => {
          const lastDateParsed = c.lastDate ? new Date(c.lastDate.length === 10 ? c.lastDate + "T12:00:00" : c.lastDate) : null;
          const lastDateFormatted = lastDateParsed && !isNaN(lastDateParsed)
            ? format(lastDateParsed, "d MMM", { locale: es })
            : "—";
          return (
            <Card key={c.id} className="p-3 border-0 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.count} compra{c.count !== 1 ? "s" : ""} · ${c.total.toLocaleString()} · último: {lastDateFormatted}
                  </p>
                </div>
                <Link to={`/promocionar`}>
                  <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs shrink-0">
                    Enviar promo
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}