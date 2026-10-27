import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ChevronRight, Loader2, RotateCw, ShoppingBag } from "lucide-react";
import { getClientOrders, CLIENT_ORDERS_PAGE_SIZE } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/TagBadge";
import OrderReference from "@/components/orders/OrderReference";
import { getOrderPaymentSummary } from "@/lib/order-summary";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const date = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });

function PurchaseHistory({ clientId, loadOrders }) {
  const [page, setPage] = useState(0);
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ["orders", "client", clientId, page],
    queryFn: () => loadOrders(clientId, page),
    retry: 1,
  });

  return (
    <div className="min-w-0 space-y-4" aria-busy={isFetching}>
      {isPending ? (
        <p role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Cargando compras...
        </p>
      ) : isError ? (
        <div className="space-y-3 py-6 text-center">
          <p role="alert" className="text-sm text-destructive">No se pudo cargar el historial de compras.</p>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" /> Reintentar
          </Button>
        </div>
      ) : data.orders.length === 0 ? (
        <p role="status" className="py-8 text-center text-sm text-muted-foreground">
          {page === 0 ? "Este cliente todavía no tiene pedidos vinculados." : "No hay más pedidos en esta página."}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground" role="status">
            {data.count === 1 ? "1 pedido" : `${data.count} pedidos`}
          </p>
          <ul className="divide-y">
            {data.orders.map((order) => {
              const { received } = getOrderPaymentSummary(order);
              return (
                <li key={order.id} className="space-y-3 py-4 first:pt-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <OrderReference order={order} />
                      {order.created_date && <p className="text-xs text-muted-foreground">{date.format(new Date(order.created_date))}</p>}
                    </div>
                    <StatusBadge status={order.status} delivered={order.status !== "cancelado" && order.delivered} />
                  </div>
                  <ul className="space-y-1 text-sm">
                    {order.items.map((item, index) => (
                      <li key={index} className="break-words">
                        <span className="text-muted-foreground">{item.quantity} × </span>{item.product_name}
                      </li>
                    ))}
                  </ul>
                  <dl className="space-y-1 text-sm tabular-nums">
                    <div className="flex flex-wrap justify-between gap-x-3">
                      <dt className="text-muted-foreground">Total</dt>
                      <dd className="font-semibold">{money.format(order.total)}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-x-3">
                      <dt className="text-muted-foreground">Total recibido</dt>
                      <dd>{money.format(received)}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-x-3">
                      <dt className="text-muted-foreground">Saldo pendiente</dt>
                      <dd className="font-semibold">{money.format(order.balance)}</dd>
                    </div>
                  </dl>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link to={`/pedido/${order.id}`}>
                      Ver detalle del pedido <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {(page > 0 || data?.count > CLIENT_ORDERS_PAGE_SIZE) && (
        <nav aria-label="Páginas del historial" className="flex items-center justify-between gap-2 border-t pt-3">
          <Button variant="outline" size="icon" aria-label="Página anterior" title="Página anterior"
            disabled={page === 0 || isFetching} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <p className="text-sm text-muted-foreground" role="status">Página {page + 1}</p>
          <Button variant="outline" size="icon" aria-label="Página siguiente" title="Página siguiente"
            disabled={!data || isError || isFetching || (page + 1) * CLIENT_ORDERS_PAGE_SIZE >= data.count}
            onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </nav>
      )}
    </div>
  );
}

export default function ClientPurchasesDialog({ client, loadOrders = getClientOrders }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-3" aria-label={`Ver compras de ${client.name}`}>
          <ShoppingBag className="mr-2 h-4 w-4" aria-hidden="true" /> Ver compras
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%_-_2rem)] max-w-lg">
        <DialogHeader className="min-w-0 pr-6 text-left">
          <DialogTitle>Historial de compras</DialogTitle>
          <DialogDescription className="break-words">{client.name}</DialogDescription>
        </DialogHeader>
        {open && <PurchaseHistory clientId={client.id} loadOrders={loadOrders} />}
      </DialogContent>
    </Dialog>
  );
}
