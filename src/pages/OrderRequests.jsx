import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getCatalogRequests } from '@/api/catalog-requests';
import { money, requestStatuses } from '@/lib/catalog-requests';
import { Button } from '@/components/ui/button';
import CatalogPrivacy from '@/components/catalog/CatalogPrivacy';
import CatalogInvitation from '@/components/catalog/CatalogInvitation';
import OrdersNavigation from '@/components/orders/OrdersNavigation';
import { trackSellerCatalog } from '@/lib/seller-catalog-tracking';

export default function OrderRequests() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const filter = ['open', 'waiting', 'all'].includes(params.get('estado')) ? params.get('estado') : 'open';
  const pageValue = Number(params.get('pagina'));
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? Math.min(pageValue - 1, 10000) : 0;
  const setPage = value => setParams({ estado: filter, pagina: String(value + 1) });
  useEffect(() => { void trackSellerCatalog(user.id, 'order_requests_opened'); }, [user.id]);
  const query = useQuery({ queryKey: ['catalog-requests', user.id, filter, page], queryFn: () => getCatalogRequests(user.id, filter, page), refetchInterval: 20000 });
  useEffect(() => {
    if (query.data && page > 0 && page * 20 >= query.data.count) {
      setParams({ estado: filter, pagina: String(Math.max(1, Math.ceil(query.data.count / 20))) }, { replace: true });
    }
  }, [query.data, page, filter, setParams]);
  return <div className="space-y-4">
    <CatalogPrivacy />
    <OrdersNavigation />
    <div className="space-y-1"><h2 className="text-lg font-bold">Solicitudes recibidas</h2><p className="text-sm text-muted-foreground">Los pedidos se crean cuando confirmas la solicitud.</p></div>
    <div className="space-y-1"><label htmlFor="request-filter" className="text-sm font-medium">Estado de solicitudes</label><select id="request-filter" value={filter} onChange={e => setParams({ estado: e.target.value })} className="w-full min-h-11 rounded-md border border-input bg-background px-3 text-sm">
      <option value="open">Por confirmar</option><option value="waiting">Esperando al comprador</option><option value="all">Todas, incluido historial</option>
    </select></div>
    {query.isPending && <p role="status">Cargando solicitudes…</p>}
    {query.isError && <div role="alert"><p>No pudimos consultar tus solicitudes.</p><Button variant="outline" onClick={() => query.refetch()}>Reintentar</Button></div>}
    {!query.isError && query.data?.rows.length === 0 && <><div className="py-4 text-center space-y-2"><Inbox className="mx-auto h-8 w-8 text-muted-foreground" /><p>{filter === 'open' ? 'No hay solicitudes por confirmar.' : filter === 'waiting' ? 'No hay ajustes esperando al comprador.' : 'Aún no has recibido solicitudes.'}</p></div><CatalogInvitation /></>}
    <div className="space-y-3">{!query.isError && query.data?.rows.map(r => <Link key={r.id} to={`/pedidos/solicitudes/${r.id}${params.size ? `?${params}` : ''}`} className="block rounded-lg border border-border bg-card p-4 space-y-2 hover:border-primary focus-visible:ring-2 ring-ring">
      <div className="flex justify-between gap-2 flex-wrap"><span className="text-xs font-mono">{r.folio}</span><span className="text-xs font-semibold text-secondary-foreground">{requestStatuses[r.status]}</span></div>
      <p className="font-semibold break-words">{r.buyer_name}</p><p className="text-sm text-muted-foreground">{r.items.length} producto{r.items.length !== 1 ? 's' : ''} · Estimado: {money(r.estimated_total)}</p><time dateTime={r.created_at} className="block text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('es-MX')}</time>
      <span className="flex min-h-8 items-center justify-end gap-1 text-sm font-medium text-secondary-foreground">Revisar solicitud<ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
    </Link>)}</div>
    {query.data && query.data.count > 20 && <div className="flex justify-between items-center"><Button variant="outline" size="icon" aria-label="Página anterior" disabled={!page} onClick={() => setPage(page - 1)}><ChevronLeft /></Button><p className="text-sm">{page + 1} / {Math.ceil(query.data.count / 20)}</p><Button variant="outline" size="icon" aria-label="Página siguiente" disabled={(page + 1) * 20 >= query.data.count} onClick={() => setPage(page + 1)}><ChevronRight /></Button></div>}
  </div>;
}
