import React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Link } from "react-router-dom";
import AppTheme from "../src/components/AppTheme";
import AppearanceSettings from "../src/components/AppearanceSettings";
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { StatusBadge } from "../src/components/shared/TagBadge";
import "../src/index.css";

createRoot(document.getElementById("root")).render(
  <MemoryRouter initialEntries={["/mensajes"]}>
    <AppTheme>
      <main className="mx-auto max-w-lg space-y-6 p-4">
        <h1 className="text-lg font-bold">Personalizar negocio</h1>
        <AppearanceSettings />
        <Input aria-label="Nombre de tienda" placeholder="Mi negocio" />
        <Button>Guardar</Button>
        <article className="space-y-3 rounded-lg bg-card p-4">
          <h2>Pedido de ejemplo</h2>
          <StatusBadge status="apartado" />
          <p className="text-muted-foreground">Total: $230</p>
          <p className="text-emerald-600">Recibido: $186.66</p>
          <p className="text-rose-500">Saldo: $43.34</p>
        </article>
        <div className="bg-amber-50 p-4 text-amber-800">Aviso de prueba</div>
        <nav className="flex gap-4"><Link to="/">Portada</Link><Link to="/mensajes">Aplicación</Link></nav>
      </main>
    </AppTheme>
  </MemoryRouter>,
);
