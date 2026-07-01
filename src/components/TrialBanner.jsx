import { useState } from "react";
import { X } from "lucide-react";
import { SUBSCRIPTION_URL } from "@/lib/access";
import { useAuth } from "@/lib/AuthContext";

export default function TrialBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { accessState, isLoadingAccess } = useAuth();
  const daysLeft = accessState.trialDaysLeft;

  if (dismissed) return null;
  if (isLoadingAccess) return null;
  if (accessState.subscriptionActive) return null;
  if (!accessState.trialActive) return null;
  if (daysLeft === null) return null;
  if (daysLeft > 7) return null;

  const title =
    daysLeft === 0
      ? "Tu prueba gratis termina hoy"
      : daysLeft === 1
        ? "Tu prueba gratis termina mañana"
        : `Te quedan ${daysLeft} días de prueba gratis`;

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-bold text-amber-700">{title}</p>
          <p className="mt-0.5 text-xs text-amber-600">
            Suscríbete por $30/mes para no perder el acceso.
          </p>
          <a
            href={SUBSCRIPTION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold text-white"
          >
            Suscribirme ahora
          </a>
        </div>
        <button type="button" onClick={() => setDismissed(true)} className="mt-0.5 text-gray-400">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
