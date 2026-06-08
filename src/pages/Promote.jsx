import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts, getSettings, getCatalogUrl } from "@/api/entities";
import { useSearchParams, Link } from "react-router-dom";
import { Copy, ArrowLeft, Package, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import WhatsAppStory from "@/components/promote/WhatsAppStory";

const WAIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);
const IGIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
);
const FBIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);

export default function Promote() {
  const [searchParams] = useSearchParams();
  const [showStory, setShowStory] = useState(false);
  const productId = searchParams.get("id");

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts("name", 500),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => getSettings(),
  });
  const settings = settingsList[0] || {};

  const product = products.find((p) => p.id === productId) || products[0];

  if (!product) {
    return (
      <div className="space-y-4">
        <Link to="/productos" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Volver a productos
        </Link>
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Selecciona un producto para promocionar</p>
        </div>
      </div>
    );
  }

  const appUrl = window.location.origin;
  const catalogUrl = getCatalogUrl(settings.catalog_slug);
  const productUrl = settings.catalog_slug
    ? `${appUrl}/producto/${product.id}?tienda=${settings.catalog_slug}`
    : `${appUrl}/producto/${product.id}`;
  const displayPrice = product.is_offer && product.offer_price ? product.offer_price : product.price;

  const msgs = {
    whatsapp: `Hola, tengo nuevo producto disponible: ${product.name}. Precio: $${displayPrice?.toLocaleString()}. Puedes verlo aquí: ${productUrl} También puedes ver más productos en mi catálogo: ${catalogUrl}`,
    facebook: `Nuevo producto disponible: ${product.name}.\nPrecio: $${displayPrice?.toLocaleString()}.\nPuedes verlo aquí: ${productUrl}\nTambién puedes revisar más productos en mi catálogo: ${catalogUrl}\nMándame mensaje si te interesa 💬`,
    instagram: `Nuevo disponible: ${product.name}\nPrecio: $${displayPrice?.toLocaleString()}\nMira el producto aquí: ${productUrl}\nTambién puedes ver más opciones en mi catálogo: ${catalogUrl}`,
  };

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const openWA = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(msgs.whatsapp)}`, "_blank");
  };

  const openIG = () => {
    window.open("https://instagram.com", "_blank");
  };

  const openFB = () => {
    window.open("https://facebook.com", "_blank");
  };

  return (
    <div className="space-y-5">
      {showStory && <WhatsAppStory product={product} onClose={() => setShowStory(false)} />}

      <div className="flex items-center gap-3">
        <Link to="/productos" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="font-display font-bold text-lg">Promocionar producto</h2>
      </div>

      {/* Product preview */}
      <div className="flex items-center gap-3 bg-card rounded-2xl p-3 shadow-sm">
        {product.photo_url ? (
          <img src={product.photo_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <div>
          <p className="font-semibold">{product.name}</p>
          <p className="text-primary font-bold">${displayPrice?.toLocaleString()}</p>
          {product.is_offer && <span className="text-[10px] text-rose-600 font-medium">🔥 En oferta</span>}
        </div>
      </div>

      {/* WhatsApp Story CTA */}
      <Button
        className="w-full h-11 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold shadow-md"
        onClick={() => setShowStory(true)}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Preparar estado de WhatsApp
      </Button>

      {/* Links */}
      <div className="bg-muted/50 rounded-xl p-3 space-y-1">
        <p className="text-xs text-muted-foreground font-medium">Liga del producto:</p>
        <p className="text-xs text-primary break-all">{productUrl}</p>
        <p className="text-xs text-muted-foreground font-medium mt-2">Liga del catálogo:</p>
        <p className="text-xs text-primary break-all">{catalogUrl}</p>
      </div>

      {/* WhatsApp */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <WAIcon /> WhatsApp
        </div>
        <div className="bg-card rounded-xl p-3 text-xs text-muted-foreground whitespace-pre-wrap border border-border/50">
          {msgs.whatsapp}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => copy(msgs.whatsapp, "Mensaje de WhatsApp copiado")}>
            <Copy className="w-3.5 h-3.5 mr-1" /> Copiar mensaje
          </Button>
          <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openWA}>
            <WAIcon /><span className="ml-1">Abrir WhatsApp</span>
          </Button>
        </div>
      </div>

      {/* Facebook */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
          <FBIcon /> Facebook
        </div>
        <div className="bg-card rounded-xl p-3 text-xs text-muted-foreground whitespace-pre-wrap border border-border/50">
          {msgs.facebook}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => copy(msgs.facebook, "Texto para Facebook copiado")}>
            <Copy className="w-3.5 h-3.5 mr-1" /> Copiar texto
          </Button>
          <Button size="sm" variant="outline" className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50" onClick={openFB}>
            <FBIcon /><span className="ml-1">Abrir Facebook</span>
          </Button>
        </div>
      </div>

      {/* Instagram */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-pink-600">
          <IGIcon /> Instagram
        </div>
        <div className="bg-card rounded-xl p-3 text-xs text-muted-foreground whitespace-pre-wrap border border-border/50">
          {msgs.instagram}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => copy(msgs.instagram, "Texto para Instagram copiado")}>
            <Copy className="w-3.5 h-3.5 mr-1" /> Copiar texto
          </Button>
          <Button size="sm" variant="outline" className="flex-1 border-pink-200 text-pink-600 hover:bg-pink-50" onClick={openIG}>
            <IGIcon /><span className="ml-1">Abrir Instagram</span>
          </Button>
        </div>
      </div>
    </div>
  );
}