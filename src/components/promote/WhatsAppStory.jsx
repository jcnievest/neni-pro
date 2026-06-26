import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Download, Loader2, Package, X } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";

const WAIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function WhatsAppStory({ product, onClose }) {
  const appUrl = window.location.origin;
  const productUrl = `${appUrl}/producto/${product.id}`;
  const catalogUrl = `${appUrl}/catalogo`;
  const isOffer = product.is_offer && product.offer_price;
  const displayPrice = isOffer ? product.offer_price : product.price;

  const [customText, setCustomText] = useState(
    isOffer
      ? `🔥 Oferta especial: ${product.name}\nAntes: $${product.price?.toLocaleString()}\nAhora: $${product.offer_price?.toLocaleString()}\nMíralo aquí: ${productUrl}`
      : `✨ Nuevo disponible: ${product.name}\nPrecio: $${product.price?.toLocaleString()}\nMíralo aquí: ${productUrl}`
  );
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef(null);

  const copy = () => { navigator.clipboard.writeText(customText); toast.success("Texto copiado"); };
  const openWA = () => window.open(`https://wa.me/?text=${encodeURIComponent(customText)}`, "_blank");

  const downloadImage = async () => {
    const el = previewRef.current;
    if (!el) return;
    setDownloading(true);
    try {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const rect = el.getBoundingClientRect();
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        width: rect.width,
        height: rect.height,
        x: 0,
        y: 0,
      });
      document.body.style.overflow = prevOverflow;
      const url = canvas.toDataURL("image/png");
      const slug = (product.name || "producto")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "producto";
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-estado-whatsapp.png`;
      a.click();
      toast.success("Imagen descargada");
    } catch (err) {
      toast.error("No se pudo descargar la imagen");
    } finally {
      setDownloading(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="bg-background w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h3 className="font-semibold text-sm">Preparar estado de WhatsApp</h3>
            <p className="text-xs text-muted-foreground">Tú lo publicas manualmente</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto max-h-[80vh]">
          <div
            ref={previewRef}
            className="mx-auto w-48 rounded-2xl overflow-hidden shadow-lg"
            style={{ position: "relative", aspectRatio: "9/16", background: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #ffe4e6 100%)" }}
          >
            <div className="w-full h-full flex flex-col relative">
              <div className="flex-1 flex items-center justify-center bg-white/40">
                {product.photo_url ? (
                  <img src={product.photo_url} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                ) : (
                  <Package className="w-16 h-16 text-primary/40" />
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white">
                {isOffer ? (
                  <div className="inline-block bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-1">
                    🔥 OFERTA
                  </div>
                ) : (
                  <div className="inline-block bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-1">
                    ✨ NUEVO
                  </div>
                )}
                <p className="text-xs font-bold leading-tight line-clamp-2">{product.name}</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  {isOffer && <span className="text-[10px] line-through opacity-70">${product.price?.toLocaleString()}</span>}
                  <span className="text-sm font-extrabold">${displayPrice?.toLocaleString()}</span>
                </div>
                <p className="text-[9px] mt-1 opacity-80">Mándame WhatsApp 💬</p>
              </div>
            </div>
          </div>
          <Button variant="outline" className="w-full h-10" onClick={downloadImage} disabled={downloading}>
            {downloading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generando imagen...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" />Descargar imagen</>
            )}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground">Vista previa 9:16 · Pantalla completa en WhatsApp</p>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Texto del estado (editable)</label>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-xs">
            <p className="text-muted-foreground">📎 Liga del producto: <span className="text-primary break-all">{productUrl}</span></p>
            <p className="text-muted-foreground">🛍️ Liga del catálogo: <span className="text-primary break-all">{catalogUrl}</span></p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="h-9" onClick={copy}>
              <Copy className="w-3.5 h-3.5 mr-1" /> Copiar texto
            </Button>
            <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openWA}>
              <WAIcon /><span className="ml-1">Abrir WhatsApp</span>
            </Button>
          </div>
          <p className="text-[10px] text-center text-muted-foreground bg-amber-50 rounded-lg p-2">
            💡 Copia el texto, abre WhatsApp, ve a <strong>Estados</strong> y pega el texto al publicar tu imagen.
          </p>
        </div>
      </div>
    </div>
  );
}