import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import usePendingRequests from '@/hooks/usePendingRequests';
import { trackSellerCatalog } from '@/lib/seller-catalog-tracking';
import { Button } from '@/components/ui/button';
import CatalogInvitation from '@/components/catalog/CatalogInvitation';

export default function OrderRequestsNotice() {
  const { user } = useAuth();
  const query = usePendingRequests();
  useEffect(() => {
    if (query.isSuccess) void trackSellerCatalog(user?.id, 'order_requests_entry_viewed');
  }, [query.isSuccess, user?.id]);
  if (query.isPending) return <p role="status" className="text-sm text-muted-foreground">Consultando solicitudes…</p>;
  if (query.isError) return <div role="alert" className="border-y border-border py-3 text-sm"><p>No pudimos consultar tus solicitudes.</p><Button asChild variant="link"><Link to="/pedidos/solicitudes">Revisar solicitudes</Link></Button></div>;
  if (!query.data) return <CatalogInvitation />;
  return <section aria-labelledby="pending-requests-title" className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
    <div className="flex items-center gap-3">
      <Inbox className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <h3 id="pending-requests-title" className="flex-1 text-base font-semibold">Solicitudes por atender</h3>
      <span className="text-xl font-bold tabular-nums text-primary" aria-label={`${query.data} solicitudes por atender`}>{query.data}</span>
    </div>
    <p className="text-sm text-muted-foreground">Tus clientes te enviaron pedidos desde tu catálogo.</p>
    <Button asChild className="min-h-11 h-auto w-full whitespace-normal bg-secondary-foreground text-secondary hover:bg-secondary-foreground/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"><Link to="/pedidos/solicitudes">Revisar solicitudes<ArrowRight className="h-4 w-4" /></Link></Button>
  </section>;
}
