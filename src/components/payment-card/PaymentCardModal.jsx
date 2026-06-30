import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Download, X } from "lucide-react";
import { toast } from "sonner";
import PaymentCardPreview from "./PaymentCardPreview";
import html2canvas from "html2canvas";

const WAIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

function buildMessage(cardData, clientName = null, amount = null, productName = null, dueDate = null) {
  const lines = [];
  if (clientName && amount && productName) {
    if (dueDate) {
      lines.push(`Hola ${clientName}, te recuerdo que tu pago de $${amount?.toLocaleString()} por tu pedido de ${productName} está programado para el ${dueDate}.`);
      lines.push("");
      lines.push("Te comparto mis datos para transferencia:");
    } else {
      lines.push(`Hola ${clientName}, te comparto los datos para liquidar tu pedido de ${productName}.`);
      lines.push("");
      lines.push(`Monto pendiente: $${amount?.toLocaleString()}`);
      lines.push("");
      lines.push("Puedes transferir a:");
    }
  } else {
    lines.push("Hola, te comparto mis datos para transferencia.");
  }
  lines.push("");
  if (cardData.holder_name) lines.push(`Titular: ${cardData.holder_name}`);
  if (cardData.bank) lines.push(`Banco: ${cardData.bank}`);
  if (cardData.clabe) lines.push(`CLABE: ${cardData.clabe}`);
  if (cardData.card_number) lines.push(`Tarjeta: ${cardData.card_number}`);
  lines.push("");
  lines.push(cardData.payment_note || "Por favor envíame tu comprobante por este medio. Gracias.");
  return lines.join("\n");
}

export default function PaymentCardModal({ cardData, onClose, clientName, amount, productName, dueDate }) {
  const [partial, setPartial] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef(null);

  const message = buildMessage(cardData, clientName, amount, productName, dueDate);

  const copyMsg = () => {
    navigator.clipboard.writeText(message);
    toast.success("Mensaje copiado");
  };

  const openWA = () => {
    const phone = cardData.phone?.replace(/\D/g, "");
    if (phone && phone.length >= 10) {
      const full = phone.length === 10 ? `52${phone}` : phone;
      window.open(`https://wa.me/${full}?text=${encodeURIComponent(message)}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    }
  };

  const downloadCard = async () => {
    setDownloading(true);
    const el = document.getElementById("payment-card-preview");
    if (!el) { setDownloading(false); return; }
    try {
      const canvas = await html2canvas(el, { scale: 3, backgroundColor: null, useCORS: true });
      canvas.toBlob(async (blob) => {
        const file = new File([blob], "tarjeta-de-cobro.png", { type: "image/png" });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Tarjeta de cobro" });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "tarjeta-de-cobro.png";
          a.click();
          URL.revokeObjectURL(url);
        }
        toast.success("¡Lista para guardar en Fotos!");
      }, "image/png");
    } catch (err) {
      toast.error("No se pudo compartir la imagen");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-background w-full max-w-md rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-base">Tarjeta de cobro</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Partial toggle */}
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setPartial(false)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!partial ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Datos completos
          </button>
          <button
            onClick={() => setPartial(true)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${partial ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Vista parcial
          </button>
        </div>

        {/* Card preview */}
        <div ref={previewRef}>
          <PaymentCardPreview
            cardData={cardData}
            clientName={clientName}
            amount={amount}
            partial={partial}
          />
        </div>

        {/* Message preview */}
        <div className="bg-muted/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground font-medium mb-2">Mensaje listo para enviar:</p>
          <p className="text-sm leading-relaxed whitespace-pre-line">{message}</p>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="h-10" onClick={copyMsg}>
              <Copy className="w-4 h-4 mr-1.5" /> Copiar mensaje
            </Button>
            <Button
              size="sm"
              className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={openWA}
            >
              <WAIcon /> <span className="ml-1.5">WhatsApp</span>
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-10"
            onClick={downloadCard}
            disabled={downloading}
          >
            <Download className="w-4 h-4 mr-1.5" />
            {downloading ? "Descargando…" : "Descargar imagen"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-10"
            onClick={() => { navigator.clipboard.writeText(message); toast.success("Listo para pegar en Instagram o Facebook"); }}
          >
            <Copy className="w-4 h-4 mr-1.5" /> Copiar para Instagram / Facebook
          </Button>
        </div>
      </div>
    </div>
  );
}