import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import usePendingRequests from '@/hooks/usePendingRequests';
import { useAuth } from '@/lib/AuthContext';
import { trackSellerCatalog } from '@/lib/seller-catalog-tracking';

export default function OrdersNavigation() {
  const { user } = useAuth();
  const { data: count, isError } = usePendingRequests();
  useEffect(() => { void trackSellerCatalog(user?.id, 'order_requests_entry_viewed'); }, [user?.id]);
  const style = ({ isActive }) => `flex min-h-12 min-w-0 items-center justify-center gap-2 border-b-2 px-2 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? 'border-primary text-secondary-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`;
  return <nav aria-label="Vistas de pedidos" className="grid grid-cols-2 border-b border-border">
    <NavLink to="/pedidos/solicitudes" className={style}>
      <span>Por confirmar</span>
      {!isError && count > 0 && <span className="min-w-5 rounded-md bg-primary/10 px-1.5 py-0.5 text-center text-xs" aria-label={`${count} solicitudes por confirmar`}>{count > 99 ? '99+' : count}</span>}
    </NavLink>
    <NavLink to="/pedidos" end className={style}>Mis pedidos</NavLink>
  </nav>;
}
