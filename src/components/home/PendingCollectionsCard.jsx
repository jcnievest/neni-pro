import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function PendingCollectionsCard({ pendingPayments }) {
  const totalPending = pendingPayments.reduce((s, o) => s + (o.balance || 0), 0);
  const clientCount = new Set(pendingPayments.map((o) => o.client_id)).size;

  if (pendingPayments.length === 0) return null;

  return (
    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4 text-rose-500" />
        </div>
        <div>
          <p className="font-bold text-rose-700 text-base">${totalPending.toLocaleString()} pendientes</p>
          <p className="text-xs text-rose-500">{clientCount} cliente{clientCount !== 1 ? "s" : ""} por cobrar</p>
        </div>
      </div>
      <Link to="/cobros">
        <Button size="sm" className="bg-rose-500 hover:bg-rose-600 text-white shrink-0 text-xs h-8 px-3">
          Ver cobros
        </Button>
      </Link>
    </div>
  );
}