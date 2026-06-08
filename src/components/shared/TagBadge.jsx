import { Badge } from "@/components/ui/badge";

const tagStyles = {
  frecuente: "bg-emerald-100 text-emerald-700 border-emerald-200",
  nuevo: "bg-sky-100 text-sky-700 border-sky-200",
  debe: "bg-rose-100 text-rose-700 border-rose-200",
  mayorista: "bg-violet-100 text-violet-700 border-violet-200",
};

const statusStyles = {
  apartado: "bg-amber-100 text-amber-700 border-amber-200",
  pendiente_pago: "bg-rose-100 text-rose-700 border-rose-200",
  pagado: "bg-emerald-100 text-emerald-700 border-emerald-200",
  entregado: "bg-sky-100 text-sky-700 border-sky-200",
  cancelado: "bg-gray-100 text-gray-500 border-gray-200",
};

const statusLabels = {
  apartado: "Apartado",
  pendiente_pago: "Pend. pago",
  pagado: "Pagado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function ClientTag({ tag }) {
  if (!tag) return null;
  return (
    <Badge variant="outline" className={`text-[10px] px-2 py-0 font-medium border ${tagStyles[tag] || ""}`}>
      {tag}
    </Badge>
  );
}

export function StatusBadge({ status, delivered }) {
  const resolvedStatus = delivered ? "entregado" : status;
  if (!resolvedStatus) return null;
  return (
    <Badge variant="outline" className={`text-[10px] px-2 py-0 font-medium border ${statusStyles[resolvedStatus] || ""}`}>
      {statusLabels[resolvedStatus] || resolvedStatus}
    </Badge>
  );
}