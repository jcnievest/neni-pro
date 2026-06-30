import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Users, Package, MessageSquare, BarChart3, LogOut } from "lucide-react";
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
  const menuRef = useRef(null);
  const title = pageTitles[location.pathname] || "Neni Pro";
  const menuId = "topbar-mobile-menu";

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const toggleMenu = () => setMenuOpen((open) => !open);

  const menuItems = [
    { to: "/clientes", icon: Users, label: "Clientes" },
    { to: "/productos", icon: Package, label: "Productos" },
    { to: "/mensajes", icon: MessageSquare, label: "Mensajes rápidos" },
    { to: "/reporte", icon: BarChart3, label: "Reporte" },
  ];

  return (
    <header className="sticky top-0 bg-card/80 backdrop-blur-lg border-b border-border z-40">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <h1 className="text-lg font-display font-bold text-foreground tracking-tight">
          {title}
        </h1>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={toggleMenu}
            className={`inline-flex h-11 w-11 shrink-0 touch-manipulation select-none items-center justify-center rounded-full bg-primary/10 text-primary transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              menuOpen ? "ring-1 ring-primary/20" : ""
            }`}
          >
            <Menu className="h-5 w-5 shrink-0" />
          </button>

          {menuOpen && (
            <div
              id={menuId}
              role="menu"
              className="absolute right-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
            >
              {menuItems.map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  role="menuitem"
                  onClick={closeMenu}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm outline-none transition-colors hover:bg-secondary focus:bg-secondary"
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{label}</span>
                </Link>
              ))}
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                role="menuitem"
                onClick={() => { closeMenu(); logout(); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-destructive outline-none transition-colors hover:bg-secondary focus:bg-secondary"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
