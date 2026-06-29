import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X } from "lucide-react";

const MP_LINK = "https://mpago.la/1FzRfQS";

export default function TrialBanner() {
  const [status, setStatus] = useState(null);
  const [daysLeft, setDaysLeft] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (!data) return;
      const trialEnd = new Date(data.trial_end);
      const now = new Date();
      const diff = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      setDaysLeft(diff);
      setStatus(data.status);
    };
    fetchSubscription();
  }, []);

  if (dismissed) return null;
  if (status === "active") return null;
  if (daysLeft === null) return null;
  if (daysLeft > 3) return null;

  const expired = daysLeft <= 0;

  return (
    <div className={`mx-4 mt-3 rounded-2xl p-4 ${expired ? "bg-rose-50 border border-rose-200" : "bg-amber-50 border border-amber-200"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {expired ? (
            <>
              <p className="font-bold text-sm text-rose-700">Tu prueba gratuita termino</p>
              <p className="text-xs text-rose-600 mt-0.5">Suscribete por $30/mes para seguir usando Nenis Pro.</p>
            </>
          ) : (
            <>
              <p className="font-bold text-sm text-amber-700">
                {daysLeft === 1 ? "Ultimo dia de prueba!" : `Te quedan ${daysLeft} dias de prueba`}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">Suscribete por $30/mes para no perder el acceso.</p>
            </>
          )}
          <a
            href={MP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-block mt-2 px-4 py-1.5 rounded-full text-xs font-bold text-white ${expired ? "bg-rose-500" : "bg-amber-500"}`}
          >
            Suscribirme ahora
          </a>
        </div>
        {!expired && (
          <button onClick={() => setDismissed(true)} className="text-gray-400 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
