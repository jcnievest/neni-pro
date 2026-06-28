import { Link, useLocation } from "react-router-dom";
import { Home, Users, Package, ShoppingBag, DollarSign, Truck, MessageSquare, BarChart3 } from "lucide-react";

const navItems = [
  { path: "/pedidos", icon: Home, label: "Inicio" },
  { path: "/pedidos", icon: ShoppingBag, label: "Pedidos" },
  { path: "/cobros", icon: DollarSign, label: "Cobros" },
  { path: "/entregas", icon: Truck, label: "Entregas" },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}