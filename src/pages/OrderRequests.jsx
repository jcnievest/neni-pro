import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getCatalogRequests } from '@/api/catalog-requests';
import { money, requestStatuses } from '@/lib/catalog-requests';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CatalogPrivacy from '@/components/catalog/CatalogPrivacy';

export default function OrderRequests() {
  const { user } = useAuth();
  const [filter, setFilter] = useState('open');
  const [page, setPage] = useState(0);
  const query = useQuery({ queryKey: ['catalog-requests', user.id, filter, page], queryFn: () => getCatalogRequests(user.id, filter, page), refetchInterval: 20000 });
  return <div className="space-y-4">
    <CatalogPrivacy />
    <Link to="/pedidos" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Pedidos</Link>
    <h2 className="text-xl font-bold">Solicitudes recibidas</h2>
    <Tabs value={filter} onValueChange={value => { setFilter(value); setPage(0); }}><TabsList><TabsTrigger value="open">Por revisar</TabsTrigger><TabsTrigger value="all">Todas</TabsTrigger></TabsList></Tabs>
    {query.isPending && <p role="status">Cargando solicitudes…</p>}
    {query.isError && <div role="alert"><p>No pudimos consultar tus solicitudes.</p><Button variant="outline" onClick={() => query.refetch()}>Reintentar</Button></div>}
    {query.data?.rows.length === 0 && <div className="py-8 text-center space-y-2"><Inbox className="mx-auto h-8 w-8 text-muted-foreground" /><p>No hay solicitudes {filter === 'open' ? 'por revisar' : 'recibidas'}.</p><Link to="/mensajes" className="underline text-sm inline-flex min-h-11 items-center">Configuración del catálogo</Link></div>}
    <div className="space-y-3">{query.data?.rows.map(r => <Link key={r.id} to={`/pedidos/solicitudes/${r.id}`} className="block rounded-lg border border-border bg-card p-4 space-y-1 hover:border-primary focus-visible:ring-2 ring-ring">
      <div className="flex justify-between gap-2 flex-wrap"><span className="text-xs font-mono">{r.folio}</span><span className="text-xs font-semibold text-primary">{requestStatuses[r.status]}</span></div>
      <p className="font-semibold break-words">{r.buyer_name}</p><p className="text-sm text-muted-foreground">{r.items.length} productos · {money(r.estimated_total)}</p><time className="block text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('es-MX')}</time>
    </Link>)}</div>
    {query.data && query.data.count > 20 && <div className="flex justify-between items-center"><Button variant="outline" size="icon" aria-label="Página anterior" disabled={!page} onClick={() => setPage(page - 1)}><ChevronLeft /></Button><p className="text-sm">{page + 1} / {Math.ceil(query.data.count / 20)}</p><Button variant="outline" size="icon" aria-label="Página siguiente" disabled={(page + 1) * 20 >= query.data.count} onClick={() => setPage(page + 1)}><ChevronRight /></Button></div>}
  </div>;
}
