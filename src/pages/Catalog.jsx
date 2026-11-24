import { useQuery } from "@tanstack/react-query";
import { getProducts, getSettings } from "@/api/entities";
import { useEffect, useState } from "react";
import { Package, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useSearchParams } from "react-router-dom";
import { getPublicCatalog, recordCatalogEvent } from '@/api/catalog-requests';
import { availabilityLabel, catalogPrice, catalogSessionId, isCatalogOffer, money, quantityIssue } from '@/lib/catalog-requests';
import CatalogRequestForm from '@/components/catalog/CatalogRequestForm';
import CatalogPrivacy from '@/components/catalog/CatalogPrivacy';
import CatalogIdentity from '@/components/catalog/CatalogIdentity';
import { getCatalogLogo } from '@/api/catalog-presentation';
import { toast } from 'sonner';

// WhatsApp SVG
const WAIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);

export default function Catalog() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | offers
  const [searchParams, setSearchParams] = useSearchParams();
  const catalogSlug = searchParams.get("tienda");
  return <CatalogContent key={catalogSlug || 'preview'} catalogSlug={catalogSlug} searchParams={searchParams} setSearchParams={setSearchParams} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} />;
}

function CatalogContent({ catalogSlug, searchParams, setSearchParams, search, setSearch, filter, setFilter }) {
  const [open, setOpen] = useState(false);
  const [visit] = useState(() => catalogSessionId(catalogSlug, 'visit'));
  const [basket, setBasket] = useState(() => {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(`nenis:basket:${catalogSlug}`) || '{}');
      return Object.fromEntries(Object.entries(saved).slice(0, 20).filter(([id, qty]) => /^[a-f0-9-]{36}$/i.test(id) && Number.isInteger(Number(qty)) && Number(qty) > 0 && Number(qty) <= 1000));
    } catch { return {}; }
  });
  const query = useQuery({
    queryKey: ['public-catalog', catalogSlug],
    queryFn: async () => {
      if (catalogSlug) return getPublicCatalog(catalogSlug);
      const products = await getProducts('name', 500);
      const settings = await getSettings();
      const logo_url = await getCatalogLogo();
      return { products, settings: { ...settings[0], logo_url } };
    }, refetchInterval: 30000,
  });
  const products = query.data?.products || [];
  const settings = query.data?.settings || {};
  const enabled = Boolean(catalogSlug && settings.catalog_orders_enabled);
  const add = (product) => {
    const next = Number(basket[product.id] || 0) + 1;
    const error = quantityIssue(product, next);
    if (error) { toast.error(error); return; }
    if (!basket[product.id] && Object.keys(basket).length >= 20) { toast.error('Máximo 20 productos diferentes por solicitud.'); return; }
    setBasket(old => ({ ...old, [product.id]: next }));
    void recordCatalogEvent(catalogSlug, visit, 'catalog_product_selected');
  };
  useEffect(() => { try { window.sessionStorage.setItem(`nenis:basket:${catalogSlug}`, JSON.stringify(basket)); } catch { /* Selection stays in memory. */ } }, [basket, catalogSlug]);
  useEffect(() => { if (enabled) void recordCatalogEvent(catalogSlug, visit, 'public_catalog_viewed'); }, [enabled, catalogSlug, visit]);
  const selectedProduct = searchParams.get('seleccionar');
  useEffect(() => {
    if (!enabled || !selectedProduct || !query.data) return;
    const product = query.data.products.find(p => p.id === selectedProduct);
    if (product && !quantityIssue(product, 1)) {
      setBasket(old => old[product.id] || Object.keys(old).length >= 20 ? old : { ...old, [product.id]: 1 });
      void recordCatalogEvent(catalogSlug, visit, 'catalog_product_selected');
    }
    const next = new URLSearchParams(searchParams); next.delete('seleccionar'); setSearchParams(next, { replace: true });
  }, [enabled, selectedProduct, query.data, catalogSlug, visit, searchParams, setSearchParams]);
  const phone = settings.whatsapp_phone?.replace(/\D/g, "");
  const fullPhone = phone?.length === 10 ? `52${phone}` : phone;

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase());
    const matchOffer = filter === "offers" ? isCatalogOffer(p) : true;
    return matchSearch && matchOffer && p.catalog_visible !== false && (enabled || p.made_to_order || p.stock == null || p.stock > 0);
  });

  const defaultMsg = `Hola, me interesa el producto *{{producto}}*. ¿Me puedes dar más información?`;

  const openWA = (product) => {
    const template = settings.catalog_wa_message || defaultMsg;
    const msg = template.replace(/{{producto}}/g, product.name);
    const waUrl = fullPhone
      ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 py-6 space-y-5 pb-28">
      <CatalogPrivacy />
      {/* Header */}
      <CatalogIdentity name={settings.shop_name || 'Catálogo'} description={settings.shop_description} logoUrl={settings.logo_url} />

      {query.isPending && <p role="status">Cargando catálogo…</p>}
      {query.isError && <div role="alert" className="space-y-2"><p>No pudimos cargar el catálogo.</p><Button variant="outline" onClick={() => query.refetch()}>Reintentar</Button></div>}
      {!query.isPending && !query.isError && !query.data && <p role="status">Este catálogo no está disponible.</p>}

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
            const displayPrice = catalogPrice(p);
            const activeOffer = isCatalogOffer(p);
            return (
              <div key={p.id} className="bg-card rounded-2xl shadow-sm overflow-hidden border border-border/50">
                {activeOffer && (
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
                    <p className="font-semibold text-sm leading-tight break-words">{p.name}</p>
                    {p.category && <p className="text-[10px] text-muted-foreground break-words">{p.category}</p>}
                  </div>
                  <div>
                    <p className="font-bold text-primary break-words">{money(displayPrice)}</p>
                    {activeOffer && (
                      <p className="text-[10px] text-muted-foreground line-through">${p.price?.toLocaleString()}</p>
                    )}
                  </div>
                  {enabled && <><p className="text-xs text-muted-foreground">{availabilityLabel(p)}</p><Button size="sm" className="w-full min-h-11 h-auto whitespace-normal text-xs" disabled={Boolean(quantityIssue(p, Number(basket[p.id] || 0) + 1))} onClick={() => add(p)}><Plus className="h-4 w-4 shrink-0" />{basket[p.id] ? `Agregar (${basket[p.id]})` : 'Seleccionar'}</Button></>}
                  {activeOffer && p.offer_description && (
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

      {enabled && <>
        <div className="fixed bottom-0 inset-x-0 border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-20">
          <Button className="w-full max-w-lg mx-auto flex min-h-12 whitespace-normal h-auto" disabled={!Object.keys(basket).length} onClick={() => { setOpen(true); void recordCatalogEvent(catalogSlug, visit, 'order_request_started'); }}><ShoppingBag className="h-5 w-5 shrink-0" />Solicitar pedido ({Object.keys(basket).length})</Button>
        </div>
        <CatalogRequestForm slug={catalogSlug} shopName={settings.shop_name} products={products} basket={basket} setBasket={setBasket} open={open} onOpenChange={setOpen} onRefresh={query.refetch} />
      </>}
      <p className="text-center text-xs text-muted-foreground pb-4">Hecho con Neni Pro ✨</p>
    </div>
  );
}
