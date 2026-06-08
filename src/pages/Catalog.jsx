import { useQuery } from "@tanstack/react-query";
import { getProducts, getSettings, getPublicProducts, getPublicSettings } from "@/api/entities";
import { useState } from "react";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useSearchParams } from "react-router-dom";

// WhatsApp SVG
const WAIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);

export default function Catalog() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | offers
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
  const settings = settingsList[0] || {};
  const phone = settings.whatsapp_phone?.replace(/\D/g, "");
  const fullPhone = phone?.length === 10 ? `52${phone}` : phone;

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase());
    const matchOffer = filter === "offers" ? p.is_offer : true;
    return matchSearch && matchOffer && (p.stock == null || p.stock > 0);
  });

  const defaultMsg = `Hola, me interesa el producto *{{producto}}*. ¿Me puedes dar más información?`;

  const openWA = (product) => {
    const template = settings.catalog_wa_message || defaultMsg;
    const msg = template.replace(/{{producto}}/g, product.name);
    const waUrl = fullPhone
      ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-display font-bold">{settings.shop_name || "Catálogo"}</h1>
        {settings.shop_description && (
          <p className="text-sm text-muted-foreground">{settings.shop_description}</p>
        )}
      </div>

      {/* Search */}
      <Input placeholder="Buscar producto..." value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="rounded-xl" />

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[["all", "Todos"], ["offers", "Ofertas 🔥"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === val ? "bg-primary text-primary-foreground shadow" : "bg-muted text-muted-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Products grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Sin productos disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((p) => {
            const displayPrice = p.is_offer && p.offer_price ? p.offer_price : p.price;
            return (
              <div key={p.id} className="bg-card rounded-2xl shadow-sm overflow-hidden border border-border/50">
                {p.is_offer && (
                  <div className="bg-rose-500 text-white text-[10px] font-bold text-center py-0.5 px-2">
                    🔥 OFERTA
                  </div>
                )}
                <Link to={catalogSlug ? `/producto/${p.id}?tienda=${catalogSlug}` : `/producto/${p.id}`}>
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.name} className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square bg-muted flex items-center justify-center">
                      <Package className="w-10 h-10 text-muted-foreground/40" />
                    </div>
                  )}
                </Link>
                <div className="p-3 space-y-2">
                  <div>
                    <p className="font-semibold text-sm leading-tight">{p.name}</p>
                    {p.category && <p className="text-[10px] text-muted-foreground">{p.category}</p>}
                  </div>
                  <div>
                    <p className="font-bold text-primary">${displayPrice?.toLocaleString()}</p>
                    {p.is_offer && p.offer_price && (
                      <p className="text-[10px] text-muted-foreground line-through">${p.price?.toLocaleString()}</p>
                    )}
                  </div>
                  {p.is_offer && p.offer_description && (
                    <p className="text-[10px] text-rose-600 font-medium">{p.offer_description}</p>
                  )}
                  <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                    onClick={() => openWA(p)}>
                    <WAIcon /><span className="ml-1">Contactar</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground pb-4">Hecho con Neni Pro ✨</p>
    </div>
  );
}