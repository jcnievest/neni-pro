import { useQuery } from "@tanstack/react-query";
import { getProducts, getSettings, getPublicProducts, getPublicSettings } from "@/api/entities";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const WAIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);

export default function ProductPublic() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const catalogSlug = searchParams.get("tienda");

  const { data: products = [] } = useQuery({
    queryKey: ["products", catalogSlug],
    queryFn: () =>
      catalogSlug ? getPublicProducts(catalogSlug, "name", 500) : getProducts("name", 500),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ["settings", catalogSlug],
    queryFn: () =>
      catalogSlug ? getPublicSettings(catalogSlug) : getSettings(),
  });

  const product = products.find((p) => p.id === id);
  const settings = settingsList[0] || {};
  const phone = settings.whatsapp_phone?.replace(/\D/g, "");
  const fullPhone = phone?.length === 10 ? `52${phone}` : phone;

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Package className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">Producto no encontrado</p>
          <Link to={catalogSlug ? `/catalogo?tienda=${catalogSlug}` : "/catalogo"}><Button variant="outline">Ver catálogo</Button></Link>
        </div>
      </div>
    );
  }

  const displayPrice = product.is_offer && product.offer_price ? product.offer_price : product.price;
  const appUrl = window.location.origin;
  const catalogUrl = `${appUrl}/catalogo`;
  const productUrl = `${appUrl}/producto/${product.id}`;

  const defaultMsg = `Hola, me interesa el producto *{{producto}}*. ¿Me puedes dar más información?`;
  const template = settings.catalog_wa_message || defaultMsg;
  const waMsg = template.replace(/{{producto}}/g, product.name);
  const waUrl = fullPhone ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(waMsg)}` : `https://wa.me/?text=${encodeURIComponent(waMsg)}`;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* Back */}
      <div className="px-4 pt-4">
        <Link to={catalogSlug ? `/catalogo?tienda=${catalogSlug}` : "/catalogo"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Ver catálogo
        </Link>
      </div>

      {/* Product image */}
      {product.photo_url ? (
        <img src={product.photo_url} alt={product.name} className="w-full aspect-square object-cover mt-3" />
      ) : (
        <div className="w-full aspect-square bg-muted flex items-center justify-center mt-3">
          <Package className="w-16 h-16 text-muted-foreground/30" />
        </div>
      )}

      <div className="px-4 py-5 space-y-4">
        {/* Title & price */}
        <div>
          {product.is_offer && (
            <span className="inline-block bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mb-2">🔥 En oferta</span>
          )}
          <h1 className="text-2xl font-display font-bold">{product.name}</h1>
          {product.category && <p className="text-sm text-muted-foreground">{product.category}</p>}
        </div>

        <div>
          <p className="text-3xl font-bold text-primary">${displayPrice?.toLocaleString()}</p>
          {product.is_offer && product.offer_price && (
            <p className="text-sm text-muted-foreground line-through mt-0.5">${product.price?.toLocaleString()} precio normal</p>
          )}
          {product.is_offer && product.offer_description && (
            <p className="text-sm text-rose-600 font-medium mt-1">{product.offer_description}</p>
          )}
          {product.offer_expiry && (
            <p className="text-xs text-muted-foreground">Oferta hasta: {product.offer_expiry}</p>
          )}
        </div>

        {product.notes && (
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-sm">{product.notes}</p>
          </div>
        )}

        {product.stock != null && (
          <p className="text-sm">
            <span className={product.stock > 0 ? "text-emerald-600 font-medium" : "text-rose-500 font-medium"}>
              {product.stock > 0 ? `✓ ${product.stock} disponibles` : "Agotado"}
            </span>
          </p>
        )}

        {/* CTA buttons */}
        <div className="space-y-2 pt-2">
          <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base rounded-2xl"
            onClick={() => window.open(waUrl, "_blank")}>
            <WAIcon /><span className="ml-2">Contactar por WhatsApp</span>
          </Button>
          <Link to={catalogSlug ? `/catalogo?tienda=${catalogSlug}` : "/catalogo"} className="block">
            <Button variant="outline" className="w-full h-12 rounded-2xl">
              Ver más productos
            </Button>
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground pb-6">Hecho con Neni Pro ✨</p>
    </div>
  );
}