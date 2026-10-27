import React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Routes, Route, Link, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ClientPurchasesDialog from "../src/components/clients/ClientPurchasesDialog";
import AppTheme from "../src/components/AppTheme";
import AppearanceSettings from "../src/components/AppearanceSettings";
import "../src/index.css";

const clients = [
  { id: "with-orders", name: "Cliente de prueba con compras" },
  { id: "empty", name: "Cliente sin compras" },
  { id: "retry", name: "Cliente con error temporal" },
  { id: "long", name: "NombreDeClienteMuyLargoParaVerificarQueNoDesbordeElHistorialEnMovil" },
];
let failures = 0;
const orders = Array.from({ length: 21 }, (_, index) => ({
  id: `test-order-${index + 1}`, reference_number: 123 + index,
  status: index === 2 ? "cancelado" : index === 1 ? "pagado" : "apartado",
  delivered: false, total: 230, advance: 100, balance: index === 1 ? 0 : 43.34,
  created_date: "2026-10-26T18:00:00Z",
  items: [{ product_name: index === 3 ? "ProductoConNombreMuyLargoQueDebeAjustarseEnPantallasPequenas" : "Camisa de prueba", quantity: 1 }],
}));
async function loadOrders(id, page) {
  await new Promise(resolve => setTimeout(resolve, 300));
  if (id === "retry" && failures++ < 2) throw new Error("Simulated network failure");
  const result = id === "empty" ? [] : id === "long" ? [orders[3]] : orders;
  return { orders: result.slice(page * 20, (page + 1) * 20), count: result.length };
}
function DetailFixture() {
  const { id } = useParams();
  return <main className="p-4"><h1>Detalle de prueba: {id}</h1><Link to="/clientes">Clientes</Link></main>;
}
createRoot(document.getElementById("root")).render(
  <MemoryRouter initialEntries={["/clientes"]}>
    <AppTheme>
      <QueryClientProvider client={new QueryClient()}>
        <Routes>
          <Route path="/clientes" element={
            <main className="mx-auto max-w-lg space-y-4 p-4">
              <h1 className="text-lg font-bold">Clientes</h1>
              <AppearanceSettings />
              {clients.map(client => <article key={client.id} className="rounded-lg bg-card p-3">
                <h2 className="break-words text-sm font-medium">{client.name}</h2>
                <ClientPurchasesDialog client={client} loadOrders={loadOrders} />
              </article>)}
            </main>
          } />
          <Route path="/pedido/:id" element={<DetailFixture />} />
        </Routes>
      </QueryClientProvider>
    </AppTheme>
  </MemoryRouter>,
);
