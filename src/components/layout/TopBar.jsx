import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Users, Package, MessageSquare, BarChart3, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/AuthContext";

const pageTitles = {
  "/": "Neni Pro",
  "/clientes": "Clientes",
  "/productos": "Productos",
  "/pedidos": "Pedidos",
  "/cobros": "Cobros pendientes",
  "/entregas": "Entregas",
  "/mensajes": "Mensajes rápidos",
  "/reporte": "Reporte",
  "/pedidos/nuevo": "Nuevo pedido",
};

export default function TopBar() {
  const location = useLocation();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const title = pageTitles[location.pathname] || "Neni Pro";
  const menuId = "topbar-mobile-menu";

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <h1 className="text-lg font-display font-bold text-foreground tracking-tight">
          {title}
        </h1>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              className={`inline-flex h-11 w-11 shrink-0 touch-manipulation select-none items-center justify-center rounded-full bg-primary/10 text-primary transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                menuOpen ? "ring-1 ring-primary/20" : ""
              }`}
            >
              <Menu className="h-5 w-5 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent id={menuId} align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/clientes" onClick={closeMenu} className="flex items-center gap-2">
                <Users className="w-4 h-4" /> Clientes
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/productos" onClick={closeMenu} className="flex items-center gap-2">
                <Package className="w-4 h-4" /> Productos
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/mensajes" onClick={closeMenu} className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Mensajes rápidos
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/reporte" onClick={closeMenu} className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Reporte
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { closeMenu(); logout(); }} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
