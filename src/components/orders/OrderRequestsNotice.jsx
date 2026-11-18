import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Inbox, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getPendingRequestCount } from '@/api/catalog-requests';

export default function OrderRequestsNotice({ onlyPending = false }) {
  const { user } = useAuth();
  const { data: count, isError } = useQuery({ queryKey: ['catalog-request-count', user.id], queryFn: () => getPendingRequestCount(user.id), refetchInterval: 20000 });
  if (onlyPending && !count) return null;
  return <Link to="/pedidos/solicitudes" className="flex min-h-12 items-center gap-3 border-y border-border py-3 text-sm focus-visible:ring-2 ring-ring">
    <Inbox className="h-5 w-5 shrink-0 text-primary" /><span className="flex-1">Solicitudes recibidas{isError && <span className="block text-xs text-muted-foreground">Abrir para consultar</span>}</span>
    {count > 0 && <span className="font-semibold text-primary">{count} por revisar</span>}<ChevronRight className="h-4 w-4 shrink-0" />
  </Link>;
}
