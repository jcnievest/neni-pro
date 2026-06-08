import { Link, useLocation } from "react-router-dom";
import { Menu, Users, Package, MessageSquare, BarChart3, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const title = pageTitles[location.pathname] || "Neni Pro";

  return (
    <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <h1 className="text-lg font-display font-bold text-foreground tracking-tight">
          {title}
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Menu className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/clientes" className="flex items-center gap-2">
                <Users className="w-4 h-4" /> Clientes
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/productos" className="flex items-center gap-2">
                <Package className="w-4 h-4" /> Productos
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/mensajes" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Mensajes rápidos
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/reporte" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Reporte
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}