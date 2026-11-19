import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, DollarSign, Truck } from "lucide-react";
import usePendingRequests from '@/hooks/usePendingRequests';

const navItems = [
  { path: "/inicio", icon: Home, label: "Inicio" },
  { path: "/pedidos", icon: ShoppingBag, label: "Pedidos" },
  { path: "/cobros", icon: DollarSign, label: "Cobros" },
  { path: "/entregas", icon: Truck, label: "Entregas" },
];

export default function MobileNav() {
  const location = useLocation();
  const { data: count, isError } = usePendingRequests();

  return (
    <nav aria-label="Navegación principal" className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path || (path === '/pedidos' && /^\/(pedidos\/|pedido\/)/.test(location.pathname));
          return (
            <Link
              key={path}
              to={path}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="relative h-5 w-5"><Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                {path === '/pedidos' && !isError && count > 0 && <span className="absolute -right-4 -top-1 min-w-4 rounded-full bg-secondary-foreground px-1 text-center text-[10px] leading-4 text-secondary" aria-label={`${count} solicitudes por confirmar`}>{count > 99 ? '99+' : count}</span>}
              </span>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
